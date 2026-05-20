import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BatchService } from '../../../core/services/batch.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { CatalogService } from '../../../core/services/catalog.service';


@Component({
  selector: 'app-batch-form',
  template: `
    <h2 mat-dialog-title><mat-icon>groups</mat-icon> Create New Batch</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate"/>
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate"/>
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="UPCOMING">Upcoming</mat-option>
              <mat-option value="ACTIVE">Active</mat-option>
              <mat-option value="COMPLETED">Completed</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Trainer</mat-label>
            <mat-select formControlName="trainerId">
              <mat-option *ngFor="let t of trainers" [value]="t.trainerId ?? t.id">
                {{ t.fullName || ('Trainer #' + (t.trainerId ?? t.id)) }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Courses</mat-label>
          <mat-select formControlName="courseIds" multiple>
            <mat-option *ngFor="let c of courses" [value]="c.id">{{ c.title }} ({{ c.code }})</mat-option>
          </mat-select>
          <mat-hint>Select at least one course</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Creating...' : 'Create Batch' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form{display:flex;flex-direction:column;gap:4px;padding-top:8px;min-width:480px} h2[mat-dialog-title]{display:flex;align-items:center;gap:8px} .full-width{width:100%} .form-row{display:flex;gap:12px} .half-width{flex:1}`]
})
export class BatchFormComponent implements OnInit {
  form = this.fb.group({
    startDate: [null, Validators.required],
    endDate: [null, Validators.required],
    status: ['UPCOMING', Validators.required],
    trainerId: [null, Validators.required],
    courseIds: [[] as number[], Validators.required]
  });
  trainers: Trainer[] = [];
  courses: Course[] = [];
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: BatchService,
    private trainerSvc: TrainerService,
    private catalogSvc: CatalogService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<BatchFormComponent>
  ) {}

  ngOnInit(): void {
    this.trainerSvc.getAll().subscribe(t => this.trainers = t);
    this.catalogSvc.getCourses().subscribe(c => this.courses = c);
  }

  private formatLocalDateTime(date: any): string {
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  save(): void {
    if (this.form.invalid) return;
    const courseIds: number[] = this.form.value.courseIds ?? [];
    if (!courseIds.length) {
      this.snack.open('Please select at least one course', 'Close', { duration: 3000 });
      return;
    }
    this.saving = true;
    const val = this.form.value as any;
    const payload: any = {
      trainerId: val.trainerId,
      status: val.status,
      startDate: val.startDate ? this.formatLocalDateTime(val.startDate) : undefined,
      endDate: val.endDate ? this.formatLocalDateTime(val.endDate) : undefined,
      courseIds
    };
    this.svc.create(payload).subscribe({
      next: () => { this.snack.open('Batch created', 'Close', { duration: 3000 }); this.dialogRef.close(true); },
      error: (e) => { this.snack.open(e.error?.message || 'Error creating batch', 'Close', { duration: 3000 }); this.saving = false; }
    });
  }
}
