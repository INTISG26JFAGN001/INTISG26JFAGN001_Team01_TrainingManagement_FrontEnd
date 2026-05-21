import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssociateService } from '../../../core/services/associate.service';
import { Associate } from '../../../core/models';

@Component({
  selector: 'app-associate-edit-form',
  template: `
    <h2 mat-dialog-title>Edit Associate</h2>
    <mat-dialog-content>
      <div class="info-row">
        <span class="info-label">Name</span>
        <span class="info-value">{{ data.fullName || ('User #' + data.userId) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">User ID</span>
        <span class="id-chip">{{ data.userId }}</span>
      </div>
      <form [formGroup]="form" class="edit-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Experience Level</mat-label>
          <mat-icon matPrefix>star</mat-icon>
          <mat-select formControlName="xp">
            <mat-option [value]="0">Junior &nbsp;<span class="xp-hint">(xp = 0)</span></mat-option>
            <mat-option [value]="1">Mid &nbsp;<span class="xp-hint">(xp = 1)</span></mat-option>
            <mat-option [value]="2">Senior &nbsp;<span class="xp-hint">(xp = 2)</span></mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving...' : 'Update' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .edit-form { display: flex; flex-direction: column; gap: 4px; padding-top: 12px; min-width: 360px; }
    .full-width { width: 100%; }
    .info-row { display: flex; align-items: center; gap: 12px; padding: 5px 0; font-size: 13px; }
    .info-label { color: var(--text-secondary); min-width: 70px; flex-shrink: 0; }
    .info-value { font-weight: 500; }
    .id-chip {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 700; font-family: monospace;
      background: rgba(0,198,255,0.08); color: var(--accent, #1565c0);
      border: 1px solid rgba(0,198,255,0.2);
    }
    .xp-hint { font-size: 11px; color: var(--text-muted); }
  `]
})
export class AssociateEditFormComponent {
  form = this.fb.group({
    xp: [this.data.xp ?? 0, Validators.required]
  });

  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: AssociateService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<AssociateEditFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Associate
  ) {}

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.svc.update({
      id: this.data.id,
      userId: this.data.userId,
      batchId: this.data.batchId ?? 0,
      xp: this.form.value.xp!
    }).subscribe({
      next: () => {
        this.snack.open('Associate updated successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.snack.open(e.error?.message || e.error || 'Failed to update associate', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
