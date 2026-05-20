import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogService } from '../../../core/services/catalog.service';
import { Technology } from '../../../core/models';

@Component({
  selector: 'app-tech-form-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data ? 'edit' : 'add_circle' }}</mat-icon>
      {{ data ? 'Edit Technology' : 'New Technology' }}
    </h2>

    <mat-dialog-content>
      <div *ngIf="data" class="context-row">
        <span class="id-chip">#{{ data.id }}</span>
        <span class="context-name">{{ data.name }}</span>
      </div>

      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Technology Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Java, Angular, Python…" />
          <mat-error>Name is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving…' : (data ? 'Update' : 'Create') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .context-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .context-name { font-size: 14px; font-weight: 500; }
    .id-chip {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 700; font-family: monospace;
      background: rgba(0,198,255,0.08); color: var(--accent);
      border: 1px solid rgba(0,198,255,0.2);
    }
    .dialog-form { padding-top: 4px; }
    .full-width { width: 360px; max-width: 100%; }
  `]
})
export class TechFormDialogComponent implements OnInit {
  form = this.fb.group({ name: ['', Validators.required] });
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: CatalogService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<TechFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Technology | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({ name: this.data.name });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = { name: this.form.value.name! };
    const action = this.data
      ? this.svc.updateTechnology(this.data.id, payload)
      : this.svc.createTechnology(payload);

    action.subscribe({
      next: () => {
        this.snack.open(`Technology ${this.data ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.snack.open('Error saving technology', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
