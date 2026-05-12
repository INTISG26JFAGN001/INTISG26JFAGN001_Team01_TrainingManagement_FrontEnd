import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { Batch, Quiz } from '../../../core/models';

@Component({
  selector: 'app-quiz-form',
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Quiz' : 'Create Quiz' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Quiz Title</mat-label>
          <mat-icon matPrefix>fact_check</mat-icon>
          <input matInput formControlName="title" placeholder="e.g. Java Fundamentals Quiz"/>
          <mat-error *ngIf="form.get('title')?.hasError('required')">Title is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Batch</mat-label>
          <mat-select formControlName="batchId">
            <mat-option *ngFor="let b of batches" [value]="b.id">{{ b.name }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('batchId')?.hasError('required')">Batch is required</mat-error>
        </mat-form-field>

        <div class="row-fields">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Duration (minutes)</mat-label>
            <mat-icon matPrefix>timer</mat-icon>
            <input matInput type="number" formControlName="durationMinutes" min="5" max="180"/>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Passing Score (%)</mat-label>
            <mat-icon matPrefix>grade</mat-icon>
            <input matInput type="number" formControlName="passingScore" min="0" max="100"/>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving...' : (data ? 'Update' : 'Create Quiz') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; min-width: 460px; }
    .full-width { width: 100%; }
    .row-fields { display: flex; gap: 12px; }
    .half-width { flex: 1; }
  `]
})
export class QuizFormComponent implements OnInit {
  batches: Batch[] = [];
  saving = false;
  form = this.fb.group({
    title: ['', Validators.required],
    batchId: [null as number | null, Validators.required],
    durationMinutes: [30, [Validators.required, Validators.min(5)]],
    passingScore: [60, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  constructor(
    private fb: FormBuilder,
    private svc: AssessmentService,
    private batchSvc: BatchService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<QuizFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Quiz | null
  ) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe(b => this.batches = b);
    if (this.data) {
      this.form.patchValue({
        title: this.data.title,
        batchId: this.data.batchId,
        durationMinutes: (this.data as any).durationMinutes ?? 30,
        passingScore: (this.data as any).passingScore ?? 60
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = { ...this.form.value, type: 'QUIZ' };
    const action = this.data
      ? this.svc.update(this.data.id, payload as any)
      : this.svc.createQuiz(payload as any);

    action.subscribe({
      next: () => {
        this.snack.open(`Quiz ${this.data ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => { this.saving = false; }
    });
  }
}
