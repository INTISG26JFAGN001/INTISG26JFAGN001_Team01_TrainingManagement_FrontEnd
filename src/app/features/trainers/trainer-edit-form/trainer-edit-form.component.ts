import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TrainerService } from '../../../core/services/trainer.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { Trainer, Technology } from '../../../core/models';

@Component({
  selector: 'app-trainer-edit-form',
  template: `
    <h2 mat-dialog-title>Edit Trainer</h2>
    <mat-dialog-content>
      <div class="info-row">
        <span class="info-label">Trainer</span>
        <span class="info-value">{{ data.fullName || ('User #' + data.userId) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">User ID</span>
        <span class="id-chip">{{ data.userId }}</span>
      </div>
      <form [formGroup]="form" class="edit-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Technologies</mat-label>
          <mat-icon matPrefix>code</mat-icon>
          <mat-select formControlName="technologyIds" multiple>
            <mat-option *ngFor="let t of technologies" [value]="t.id">{{ t.name }}</mat-option>
          </mat-select>
          <mat-hint>Select all technologies this trainer specializes in</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        {{ saving ? 'Saving...' : 'Update' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .edit-form { display: flex; flex-direction: column; gap: 4px; padding-top: 12px; min-width: 400px; }
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
  `]
})
export class TrainerEditFormComponent implements OnInit {
  form = this.fb.group({
    technologyIds: [this.data.technologyIds ?? [] as number[]]
  });

  technologies: Technology[] = [];
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: TrainerService,
    private catalogSvc: CatalogService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<TrainerEditFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Trainer
  ) {}

  ngOnInit(): void {
    this.catalogSvc.getTechnologies().subscribe(techs => { this.technologies = techs; });
  }

  save(): void {
    this.saving = true;
    const trainerId = (this.data.trainerId ?? this.data.id)!;
    const techIds = (this.form.value.technologyIds ?? []) as number[];
    this.svc.updateTechnologies(trainerId, techIds).subscribe({
      next: () => {
        this.snack.open('Trainer technologies updated.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.snack.open(e.error?.message || 'Failed to update trainer', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
