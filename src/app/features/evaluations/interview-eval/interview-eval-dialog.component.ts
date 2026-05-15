import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AssessmentService, InterviewEvaluationRequest } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { AuthService } from '../../../core/services/auth.service';
import { Rubric, Associate } from '../../../core/models';

export interface InterviewEvalDialogData {
  interviewId: number;
  title: string;
  batchId: number;
  preselectedAssociateId?: number;
}

@Component({
  selector: 'app-interview-eval-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>star_rate</mat-icon>
      Evaluate — {{ data.title }}
    </h2>

    <mat-dialog-content class="dialog-body">

      <div *ngIf="loading" class="loading-center"><mat-spinner diameter="36"></mat-spinner></div>

      <form [formGroup]="form" *ngIf="!loading">

        <!-- Associate selector -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Associate</mat-label>
          <mat-icon matPrefix>person</mat-icon>
          <mat-select formControlName="associateId" (selectionChange)="onAssociateChange()">
            <mat-option *ngFor="let a of associates" [value]="a.id">
              {{ getAssociateName(a) }}
            </mat-option>
          </mat-select>
          <mat-error>Select an associate</mat-error>
        </mat-form-field>

        <!-- Already evaluated notice -->
        <mat-card class="result-card" *ngIf="existingResult">
          <mat-icon [class]="existingResult.resultStatus === 'PASS' ? 'icon-pass' : 'icon-fail'">
            {{ existingResult.resultStatus === 'PASS' ? 'check_circle' : 'cancel' }}
          </mat-icon>
          <div>
            <strong>Already Evaluated</strong>
            <p>Score: {{ existingResult.totalScore }} / {{ existingResult.maxScore }} — <strong>{{ existingResult.resultStatus }}</strong></p>
            <p class="eval-date">Evaluated on {{ existingResult.evaluatedAt | date:'medium' }}</p>
          </div>
        </mat-card>

        <!-- Rubric scores (only if not already evaluated) -->
        <ng-container *ngIf="!existingResult">

          <p class="section-label">Rubric Scores</p>

          <!-- Score summary -->
          <div class="score-summary">
            <span>Current Score:</span>
            <strong [class.score-pass]="totalScore / maxScore >= 0.6"
                    [class.score-fail]="maxScore > 0 && totalScore / maxScore < 0.6">
              {{ totalScore }} / {{ maxScore }}
            </strong>
            <span class="pass-info">(Pass &ge; 60%)</span>
          </div>

          <div *ngIf="rubrics.length === 0" class="no-rubrics">
            No rubrics defined for this interview.
          </div>

          <div formArrayName="rubricScores">
            <div *ngFor="let score of rubricScores.controls; let i = index"
                 [formGroupName]="i" class="rubric-score-row">
              <div class="rubric-label">
                <span class="criteria-name">{{ rubrics[i].criteria }}</span>
                <span class="weight-tag">max {{ rubrics[i].weight }}</span>
              </div>
              <mat-form-field appearance="outline" class="score-field">
                <mat-label>Score</mat-label>
                <input matInput type="number" formControlName="scoreAwarded"
                       min="0" [attr.max]="rubrics[i].weight" placeholder="0"/>
                <mat-hint>0 – {{ rubrics[i].weight }}</mat-hint>
                <mat-error>Score must be 0–{{ rubrics[i].weight }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline" class="remarks-field">
                <mat-label>Remarks</mat-label>
                <input matInput formControlName="remarks" placeholder="Optional remarks"/>
              </mat-form-field>
            </div>
          </div>

          <mat-form-field appearance="outline" class="full-width" style="margin-top: 8px;">
            <mat-label>Overall Remarks</mat-label>
            <textarea matInput formControlName="evaluatorRemarks" rows="2"
                      placeholder="Overall evaluator comments..."></textarea>
          </mat-form-field>

        </ng-container>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()"
              [disabled]="form.invalid || saving || !!existingResult || loading"
              *ngIf="!existingResult">
        <mat-icon>{{ saving ? 'hourglass_empty' : 'send' }}</mat-icon>
        {{ saving ? 'Submitting...' : 'Submit Evaluation' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 700; color: var(--text-primary);
      mat-icon { color: var(--accent); }
    }
    .dialog-body { min-width: 480px; max-width: 680px; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 40px; }

    .result-card {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px; margin-bottom: 16px;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
    }
    .icon-pass { color: #34d399; font-size: 28px; width: 28px; height: 28px; }
    .icon-fail { color: #ef4444; font-size: 28px; width: 28px; height: 28px; }
    .eval-date { font-size: 11px; color: var(--text-secondary); margin: 4px 0 0; }

    .section-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .5px; color: var(--text-secondary); margin: 12px 0 8px;
    }

    .score-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 8px;
      background: var(--bg-input); border: 1px solid var(--border);
      font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;
    }
    .score-pass { color: #34d399; }
    .score-fail { color: #ef4444; }
    .pass-info { font-size: 11px; color: var(--text-muted); }

    .no-rubrics {
      padding: 20px; text-align: center;
      color: var(--text-muted); font-size: 13px;
    }

    .rubric-score-row {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 4px; flex-wrap: wrap;
    }
    .rubric-label {
      flex: 1; min-width: 140px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .criteria-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .weight-tag {
      font-size: 11px; color: var(--text-secondary);
      background: var(--bg-input); padding: 2px 8px;
      border-radius: 4px; width: fit-content;
    }
    .score-field { width: 110px; flex-shrink: 0; }
    .remarks-field { flex: 1; min-width: 160px; }
  `]
})
export class InterviewEvalDialogComponent implements OnInit {
  rubrics: Rubric[] = [];
  associates: Associate[] = [];
  loading = true;
  saving = false;
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
    private batchSvc: BatchService,
    private auth: AuthService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<InterviewEvalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InterviewEvalDialogData
  ) {}

  ngOnInit(): void {
    forkJoin({
      rubrics:  this.svc.getRubrics(this.data.interviewId).pipe(catchError(() => of([]))),
      details:  this.batchSvc.getDetails(this.data.batchId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: res => {
        this.rubrics    = res.rubrics as Rubric[];
        this.associates = (res.details as any)?.associates ?? [];

        this.rubricScores.clear();
        this.rubrics.forEach(r => {
          this.rubricScores.push(this.fb.group({
            rubricId:     [r.id],
            criteria:     [r.criteria],
            weight:       [r.weight],
            scoreAwarded: [0, [Validators.required, Validators.min(0), Validators.max(r.weight)]],
            remarks:      ['']
          }));
        });
        this.loading = false;

        // Preselect associate if provided
        if (this.data.preselectedAssociateId) {
          this.form.patchValue({ associateId: this.data.preselectedAssociateId });
          this.onAssociateChange();
        }
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
        this.snack.open('This associate has already been evaluated. Showing existing result.', 'Close', { duration: 4000 });
      },
      error: () => {
        this.existingResult = null;
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
    const payload: InterviewEvaluationRequest = {
      assessmentId: this.data.interviewId,
      associateId: v.associateId!,
      evaluatorId: this.auth.getUserId(),
      evaluatorRole: this.auth.getRole() || '',
      evaluatorRemarks: v.evaluatorRemarks || '',
      rubricScores: (v.rubricScores as any[]).map(rs => ({
        rubricId: rs.rubricId,
        criteria: rs.criteria,
        weight: rs.weight,
        scoreAwarded: rs.scoreAwarded,
        remarks: rs.remarks
      }))
    };

    this.svc.submitInterviewEvaluation(payload).subscribe({
      next: result => {
        this.snack.open(
          `Evaluation submitted — ${result.resultStatus} (${result.totalScore}/${result.maxScore})`,
          'Close', { duration: 4000 }
        );
        this.dialogRef.close(true);
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to submit evaluation', 'Close', { duration: 4000 });
        this.saving = false;
      }
    });
  }
}
