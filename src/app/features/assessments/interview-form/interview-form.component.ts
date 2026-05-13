import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { Batch, Interview } from '../../../core/models';

@Component({
  selector: 'app-interview-form',
  templateUrl: './interview-form.component.html',
  styleUrls: ['./interview-form.component.scss']
})
export class InterviewFormComponent implements OnInit {
  batches: Batch[] = [];
  saving = false;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    batchId: [null as number | null, Validators.required],
    interviewCategory: ['INTERIM', Validators.required],
    dueDate: ['', Validators.required],
    scheduledDateTime: [null as string | null],
    evaluatorRole: [''],
    maxScore: [100, [Validators.min(1)]],
    status: ['DRAFT']
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
        interviewCategory: this.data.interviewCategory ?? 'INTERIM',
        dueDate: this.data.dueDate ?? '',
        scheduledDateTime: this.data.scheduledDateTime ?? null,
        evaluatorRole: this.data.evaluatorRole ?? '',
        maxScore: this.data.maxScore ?? 100,
        status: this.data.status ?? 'DRAFT'
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;

    const payload: any = {
      title: v.title,
      batchId: v.batchId,
      interviewCategory: v.interviewCategory,
      dueDate: v.dueDate,
      status: v.status || 'DRAFT'
    };
    if (v.scheduledDateTime) payload.scheduledDateTime = v.scheduledDateTime;
    if (v.evaluatorRole) payload.evaluatorRole = v.evaluatorRole;
    if (v.maxScore) payload.maxScore = v.maxScore;

    const action = this.data
      ? this.svc.update(this.data.id, payload)
      : this.svc.createInterview(payload);

    action.subscribe({
      next: () => {
        this.snack.open(`Interview ${this.data ? 'updated' : 'created'}. Add rubrics to enable publishing.`, 'Close', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to save interview', 'Close', { duration: 4000 });
        this.saving = false;
      }
    });
  }
}
