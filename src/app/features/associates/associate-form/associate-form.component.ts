import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AssociateService } from '../../../core/services/associate.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-associate-form',
  templateUrl: './associate-form.component.html',
  styleUrls: ['./associate-form.component.scss']
})
export class AssociateFormComponent {
  form = this.fb.group({
    userId: [null as number | null, [Validators.required, Validators.min(1)]],
    xp: [0, Validators.required]
  });

  // Verification state
  validatedUser: User | null = null;
  validationError = '';
  validating = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: AssociateService,
    private userSvc: UserService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<AssociateFormComponent>
  ) {}

  onUserIdChange(): void {
    // Clear verification result whenever the ID field changes
    this.validatedUser = null;
    this.validationError = '';
  }

  /** Verify user exists, has ROLE_ASSOCIATE, and is not already an associate */
  verifyUser(): void {
    const userId = this.form.value.userId;
    if (!userId || userId < 1) return;

    this.validatedUser = null;
    this.validationError = '';
    this.validating = true;

    // Fetch user details + existing associates in parallel
    forkJoin({
      user: this.userSvc.getById(userId),
      associates: this.svc.getAll()
    }).subscribe({
      next: ({ user, associates }) => {
        this.validating = false;
        const role = Array.isArray(user.roles) ? user.roles[0] : (user.roles as any);

        // 1. Role check
        if (role !== 'ROLE_ASSOCIATE') {
          this.validationError =
            `"${user.fullName || user.username}" has role ${role}. Only ROLE_ASSOCIATE users can be added as associates.`;
          return;
        }

        // 2. Duplicate check — is this userId already an associate?
        const duplicate = associates.find((a: any) => a.userId === userId);
        if (duplicate) {
          this.validationError =
            `"${user.fullName || user.username}" is already registered as an associate (Associate ID: ${duplicate.id}).`;
          return;
        }

        this.validatedUser = user;
      },
      error: () => {
        this.validating = false;
        this.validationError =
          `No user found with ID ${userId}. Check the Users page for the correct ID.`;
      }
    });
  }

  get canSubmit(): boolean {
    return this.form.valid && !!this.validatedUser && !this.saving;
  }

  save(): void {
    if (!this.canSubmit) return;
    this.saving = true;

    // Exact payload matching backend CreateAssociateDTO:
    //   userId  (long)  — the user's system ID
    //   batchid (long)  — lowercase 'd', 0 = no batch yet
    //   xp      (int)   — 0=JUNIOR, 1=MID, 2=SENIOR
    this.svc.create({
      userId: this.form.value.userId!,
      batchid: 0,
      xp: this.form.value.xp!
    }).subscribe({
      next: () => {
        this.snack.open(
          `Associate "${this.validatedUser!.fullName || this.validatedUser!.username}" added. Assign a batch via the Enrollments page.`,
          'Close', { duration: 5000 }
        );
        this.dialogRef.close(true);
      },
      error: (e) => {
        const rawMsg: string = e.error?.message || e.error || '';
        const isDuplicate =
          e.status === 409 ||
          rawMsg.toLowerCase().includes('already exists');
        this.snack.open(
          isDuplicate ? 'This User ID is already registered as an associate.' : (rawMsg || 'Failed to add associate'),
          'Close', { duration: 4000 }
        );
        this.saving = false;
      }
    });
  }
}
