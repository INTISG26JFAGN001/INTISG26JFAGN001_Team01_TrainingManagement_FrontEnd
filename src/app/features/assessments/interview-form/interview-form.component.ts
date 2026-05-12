import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { Batch, Interview } from '../../../core/models';

@Component({
  selector: 'app-interview-form',
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Interview' : 'Schedule Interview' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Interview Title</mat-label>
          <mat-icon matPrefix>record_voice_over</mat-icon>
          <input matInput formControlName="title" placeholder="e.g. Technical Interview – Round 1"/>
          <mat-error *ngIf="form.get('title')?.hasError('required')">Title is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Batch</mat-label>
          <mat-select formControlName="batchId">
            <mat-option *ngFor="let b of batches" [value]="b.id">{{ b.name }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('batchId')?.hasError('required')">Batch is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option value="TECHNICAL">Technical</mat-option>
            <mat-option value="HR">HR</mat-option>
            <mat-option value="MANAGERIAL">Managerial</mat-option>
            <mat-option value="BEHAVIORAL">Behavioral</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('category')?.hasError('required')">Category is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Interview Date</mat-label>
          <mat-icon matPrefix>event</mat-icon>
          <input matInput [matDatepicker]="picker" formControlName="interviewDate"/>
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          <mat-error *ngIf="form.get('interviewDate')?.hasError('required')">Date is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving...' : (data ? 'Update' : 'Schedule Interview') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; min-width: 460px; }
    .full-width { width: 100%; }
  `]
})
export class InterviewFormComponent implements OnInit {
  batches: Batch[] = [];
  saving = false;
  form = this.fb.group({
    title: ['', Validators.required],
    batchId: [null as number | null, Validators.required],
    category: ['TECHNICAL', Validators.required],
    interviewDate: [null as string | null, Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private svc: AssessmentService,
    private batchSvc: BatchService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<InterviewFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Interview | null
  ) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe(b => this.batches = b);
    if (this.data) {
      this.form.patchValue({
        title: this.data.title,
        batchId: this.data.batchId,
        category: (this.data as any).category ?? 'TECHNICAL',
        interviewDate: (this.data as any).interviewDate ?? null
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = { ...this.form.value, type: 'INTERVIEW' };
    const action = this.data
      ? this.svc.update(this.data.id, payload as any)
      : this.svc.createInterview(payload as any);

    action.subscribe({
      next: () => {
        this.snack.open(`Interview ${this.data ? 'updated' : 'scheduled'}`, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => { this.saving = false; }
    });
  }
}
