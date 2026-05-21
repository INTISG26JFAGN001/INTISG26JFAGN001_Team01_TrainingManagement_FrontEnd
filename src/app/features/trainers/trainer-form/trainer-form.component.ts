import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { TrainerService } from '../../../core/services/trainer.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { UserService } from '../../../core/services/user.service';
import { User, Technology } from '../../../core/models';

@Component({
  selector: 'app-trainer-form',
  templateUrl: './trainer-form.component.html',
  styleUrls: ['./trainer-form.component.scss']
})
export class TrainerFormComponent implements OnInit {
  form = this.fb.group({
    userId: [null as number | null, [Validators.required, Validators.min(1)]],
    technologyIds: [[] as number[]]
  });

  technologies: Technology[] = [];

  // Verification state
  validatedUser: User | null = null;
  validationError = '';
  validating = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: TrainerService,
    private catalogSvc: CatalogService,
    private userSvc: UserService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<TrainerFormComponent>
  ) {}

  ngOnInit(): void {
    this.catalogSvc.getTechnologies().subscribe(t => this.technologies = t);
  }

  onUserIdChange(): void {
    // Clear previous verification whenever the ID field changes
    this.validatedUser = null;
    this.validationError = '';
  }

  verifyUser(): void {
    const userId = this.form.value.userId;
    if (!userId || userId < 1) return;

    this.validatedUser = null;
    this.validationError = '';
    this.validating = true;

    // Verify user exists AND check for duplicate trainer in one go
    forkJoin({
      user: this.userSvc.getById(userId),
      trainers: this.svc.getAll()
    }).subscribe({
      next: ({ user, trainers }) => {
        this.validating = false;
        const role = Array.isArray(user.roles) ? user.roles[0] : (user.roles as any);

        // 1. Role check
        if (role !== 'ROLE_TRAINER') {
          this.validationError =
            `"${user.fullName || user.username}" has role ${role}. Only ROLE_TRAINER users can be added as trainers.`;
          return;
        }

        // 2. Duplicate check — is this userId already a trainer?
        const duplicate = trainers.find(t => Number(t.userId) === Number(userId));
        if (duplicate) {
          this.validationError =
            `"${user.fullName || user.username}" is already registered as a trainer (Trainer ID: ${duplicate.trainerId ?? duplicate.id}).`;
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
    const technologyIds = (this.form.value.technologyIds ?? []) as number[];

    this.svc.create({ userId: this.form.value.userId!, technologyIds } as any).subscribe({
      next: () => {
        this.snack.open(
          `Trainer "${this.validatedUser!.fullName || this.validatedUser!.username}" added successfully.`,
          'Close', { duration: 4000 }
        );
        this.dialogRef.close(true);
      },
      error: (e) => {
        const rawMsg: string = e.error?.message || e.error || '';
        const isDuplicate =
          e.status === 409 ||
          rawMsg.toLowerCase().includes('duplicate') ||
          rawMsg.toLowerCase().includes('already exists') ||
          (e.status === 500 && rawMsg.toLowerCase().includes('unique'));
        this.snack.open(
          isDuplicate ? 'A trainer with this User ID already exists.' : (rawMsg || 'Failed to add trainer'),
          'Close', { duration: 4000 }
        );
        this.saving = false;
      }
    });
  }
}
