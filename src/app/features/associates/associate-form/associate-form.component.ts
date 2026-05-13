import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssociateService } from '../../../core/services/associate.service';

@Component({
  selector: 'app-associate-form',
  template: `
    <h2 mat-dialog-title><mat-icon>person_add</mat-icon> Add Associate</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>User ID</mat-label>
          <input matInput type="number" formControlName="userId" placeholder="Enter existing user ID"/>
          <mat-hint>The user must already exist with ROLE_ASSOCIATE</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Experience Level</mat-label>
          <mat-select formControlName="xp">
            <mat-option [value]="0">Junior (0)</mat-option>
            <mat-option [value]="1">Mid (1)</mat-option>
            <mat-option [value]="2">Senior (2)</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Adding...' : 'Add Associate' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form{display:flex;flex-direction:column;gap:8px;padding-top:8px;min-width:420px}.full-width{width:100%}h2[mat-dialog-title]{display:flex;align-items:center;gap:8px}`]
})
export class AssociateFormComponent implements OnInit {
  form = this.fb.group({
    userId: [null as number | null, [Validators.required, Validators.min(1)]],
    xp: [0, Validators.required]
  });
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: AssociateService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<AssociateFormComponent>
  ) {}

  ngOnInit(): void {}

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const val = this.form.value;
    // Backend CreateAssociateDTO uses 'batchid' (lowercase d), default 0 means no batch yet
    const payload = { userId: val.userId, xp: val.xp, batchid: 0 };
    this.svc.create(payload as any).subscribe({
      next: () => {
        this.snack.open('Associate added', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.snack.open(e.error?.message || 'Failed to add associate', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
