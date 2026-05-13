import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { Rubric } from '../../../core/models';

export interface RubricDialogData { interviewId: number; title: string; status: string; }

@Component({
  selector: 'app-interview-rubric-dialog',
  templateUrl: './interview-rubric-dialog.component.html',
  styleUrls: ['./interview-rubric-dialog.component.scss']
})
export class InterviewRubricDialogComponent implements OnInit {
  rubrics: Rubric[] = [];
  loading = true;
  saving = false;
  publishing = false;

  form = this.fb.group({
    criteria: ['', Validators.required],
    weight: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100)]],
    description: ['']
  });

  constructor(
    private fb: FormBuilder,
    private svc: AssessmentService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<InterviewRubricDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RubricDialogData
  ) {}

  ngOnInit(): void { this.loadRubrics(); }

  loadRubrics(): void {
    this.loading = true;
    this.svc.getRubrics(this.data.interviewId).subscribe({
      next: r => { this.rubrics = r; this.loading = false; },
      error: () => this.loading = false
    });
  }

  get totalWeight(): number { return this.rubrics.reduce((s, r) => s + (r.weight || 0), 0); }
  get weightOk(): boolean { return this.totalWeight === 100; }
  get weightLeft(): number { return 100 - this.totalWeight; }
  get isPublished(): boolean { return this.data.status === 'PUBLISHED'; }

  addRubric(): void {
    if (this.form.invalid || this.saving) return;
    if (this.totalWeight + (this.form.value.weight ?? 0) > 100) {
      this.snack.open(`Cannot add: would exceed 100 (${this.weightLeft} remaining)`, 'Close', { duration: 3000 });
      return;
    }
    this.saving = true;
    const v = this.form.value;
    this.svc.createRubric(this.data.interviewId, { criteria: v.criteria!, weight: v.weight!, description: v.description || '' }).subscribe({
      next: () => {
        this.snack.open('Rubric added', 'Close', { duration: 2000 });
        this.form.reset();
        this.saving = false;
        this.loadRubrics();
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to add rubric', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  deleteRubric(r: Rubric): void {
    this.svc.deleteRubric(this.data.interviewId, r.id).subscribe({
      next: () => { this.snack.open('Rubric removed', 'Close', { duration: 2000 }); this.loadRubrics(); },
      error: e => this.snack.open(e.error?.message || 'Failed to remove', 'Close', { duration: 3000 })
    });
  }

  publish(): void {
    if (!this.weightOk || this.publishing) return;
    this.publishing = true;
    this.svc.publishInterview(this.data.interviewId).subscribe({
      next: () => {
        this.snack.open('Interview published successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to publish', 'Close', { duration: 4000 });
        this.publishing = false;
      }
    });
  }
}
