import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AssociateService } from '../../../core/services/associate.service';
import { AuthService } from '../../../core/services/auth.service';
import { Rubric, Associate } from '../../../core/models';

export interface EvaluateDialogData { interviewId: number; title: string; batchId: number; }

@Component({
  selector: 'app-interview-evaluate-dialog',
  templateUrl: './interview-evaluate-dialog.component.html',
  styleUrls: ['./interview-evaluate-dialog.component.scss']
})
export class InterviewEvaluateDialogComponent implements OnInit {
  rubrics: Rubric[] = [];
  associates: Associate[] = [];
  loading = true;
  saving = false;
  submitted = false;
  existingResult: any = null;

  form = this.fb.group({
    associateId: [null as number | null, Validators.required],
    evaluatorRemarks: [''],
    rubricScores: this.fb.array([])
  });

  get rubricScores(): FormArray { return this.form.get('rubricScores') as FormArray; }

  constructor(
    private fb: FormBuilder,
    private svc: AssessmentService,
    private associateSvc: AssociateService,
    private auth: AuthService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<InterviewEvaluateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EvaluateDialogData
  ) {}

  ngOnInit(): void {
    forkJoin({
      rubrics: this.svc.getRubrics(this.data.interviewId),
      associates: this.associateSvc.getByBatch(this.data.batchId)
    }).subscribe({
      next: res => {
        this.rubrics = res.rubrics;
        this.associates = res.associates;
        this.rubricScores.clear();
        res.rubrics.forEach(r => {
          this.rubricScores.push(this.fb.group({
            rubricId: [r.id],
            criteria: [r.criteria],
            weight: [r.weight],
            scoreAwarded: [0, [Validators.required, Validators.min(0), Validators.max(r.weight)]],
            remarks: ['']
          }));
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onAssociateChange(): void {
    const associateId = this.form.value.associateId;
    if (!associateId) return;
    this.svc.getEvaluationByAssociate(this.data.interviewId, associateId).subscribe({
      next: result => {
        this.existingResult = result;
        this.submitted = true;
        this.snack.open('This associate has already been evaluated. Showing existing result.', 'Close', { duration: 4000 });
      },
      error: () => {
        this.existingResult = null;
        this.submitted = false;
      }
    });
  }

  get totalScore(): number {
    return this.rubricScores.controls.reduce((s, c) => s + (c.get('scoreAwarded')?.value || 0), 0);
  }

  get maxScore(): number {
    return this.rubrics.reduce((s, r) => s + (r.weight || 0), 0);
  }

  getAssociateName(a: Associate): string {
    return a.fullName || ('User #' + a.userId);
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const v = this.form.value;
    const payload = {
      assessmentId: this.data.interviewId,
      associateId: v.associateId,
      evaluatorId: this.auth.getUserId(),
      evaluatorRole: this.auth.getRole() || '',
      evaluatorRemarks: v.evaluatorRemarks || '',
      rubricScores: v.rubricScores
    };

    this.svc.submitInterviewEvaluation(payload as any).subscribe({
      next: result => {
        this.snack.open(`Evaluation submitted — ${result.resultStatus} (${result.totalScore}/${result.maxScore})`, 'Close', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to submit evaluation', 'Close', { duration: 4000 });
        this.saving = false;
      }
    });
  }
}
