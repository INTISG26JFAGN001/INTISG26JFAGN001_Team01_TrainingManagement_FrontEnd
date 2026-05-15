import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormArray, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  AssessmentService,
  InterviewEvaluationRequest,
  InterviewEvaluationResponse
} from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { AssociateService } from '../../../core/services/associate.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { Batch, Associate, Interview, Rubric, Enrollment, User } from '../../../core/models';

export interface AssociateRow {
  associate: Associate;
  evaluation: InterviewEvaluationResponse | null;
}

@Component({
  selector: 'app-interview-eval',
  templateUrl: './interview-eval.component.html',
  styleUrls: ['./interview-eval.component.scss']
})
export class InterviewEvalComponent implements OnInit {
  batches: Batch[] = [];
  interviews: Interview[] = [];
  rows: AssociateRow[] = [];
  rubrics: Rubric[] = [];

  batchSearch = '';
  activeBatchId: number | null = null;
  selectedInterview: Interview | null = null;
  evaluatingRow: AssociateRow | null = null;

  loadingInterviews = false;
  loadingAssociates = false;
  loadingRubrics = false;
  saving = false;

  form = this.fb.group({
    evaluatorRemarks: [''],
    rubricScores: this.fb.array([])
  });

  get rubricScores(): FormArray { return this.form.get('rubricScores') as FormArray; }

  get totalScore(): number {
    return this.rubricScores.controls.reduce((s, c) => s + (+(c.get('scoreAwarded')?.value) || 0), 0);
  }
  get maxScore(): number { return this.rubrics.reduce((s, r) => s + (r.weight || 0), 0); }
  get passPct(): number { return this.maxScore > 0 ? (this.totalScore / this.maxScore) * 100 : 0; }

  get pendingRows(): AssociateRow[] { return this.rows.filter(r => !r.evaluation); }
  get doneRows(): AssociateRow[]    { return this.rows.filter(r => !!r.evaluation); }

  constructor(
    private fb: FormBuilder,
    private assessmentSvc: AssessmentService,
    private batchSvc: BatchService,
    private associateSvc: AssociateService,
    private userSvc: UserService,
    private auth: AuthService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe({ next: b => this.batches = b, error: () => {} });
  }

  parseBatchId(text: string): number | null {
    if (!text) return null;
    const m = text.match(/^#(\d+)/);
    if (m) return +m[1];
    if (/^\d+$/.test(text.trim())) return +text.trim();
    return null;
  }

  onBatchChange(value: string): void {
    this.batchSearch = value;
    const batchId = this.parseBatchId(value);
    if (batchId === this.activeBatchId) return;

    this.activeBatchId = batchId;
    this.interviews = [];
    this.rows = [];
    this.selectedInterview = null;
    this.evaluatingRow = null;

    if (!batchId) return;

    this.loadingInterviews = true;
    this.assessmentSvc.getInterviewsByBatch(batchId).pipe(catchError(() => of([]))).subscribe(list => {
      this.interviews = list.filter(i => i.status === 'PUBLISHED' || i.status === 'CLOSED');
      this.loadingInterviews = false;
    });
  }

  onInterviewSelect(value: any): void {
    const id = value ? Number(value) : null;
    this.selectedInterview = id ? (this.interviews.find(i => i.id === id) ?? null) : null;
    this.rows = [];
    this.evaluatingRow = null;

    if (!this.selectedInterview || !this.activeBatchId) return;

    this.loadingAssociates = true;
    const batchId = this.activeBatchId;
    const interviewId = this.selectedInterview.id;

    // Step 1: Load enrollments, associates list, and existing evaluations in parallel
    forkJoin({
      enrollments:   this.associateSvc.getEnrollmentsByBatch(batchId).pipe(catchError(() => of([]))),
      allAssociates: this.associateSvc.getAll().pipe(catchError(() => of([]))),
      evaluations:   this.assessmentSvc.getEvaluationsByAssessment(interviewId).pipe(catchError(() => of([])))
    }).pipe(
      switchMap(({ enrollments, allAssociates, evaluations }) => {
        const assocMap = new Map<number, Associate>((allAssociates as Associate[]).map(a => [a.id, a]));
        const evalMap  = new Map<number, InterviewEvaluationResponse>(
          (evaluations as InterviewEvaluationResponse[]).map(e => [e.associateId, e])
        );

        // Active enrollments → find their associate record
        const activeEnrollments = (enrollments as Enrollment[])
          .filter(e => e.status === 'ACTIVE' || e.status === 'ENROLLED' || e.status === 'COMPLETED');

        const assocList = activeEnrollments.map(e =>
          assocMap.get(e.associateId) ?? { id: e.associateId, userId: e.associateId } as Associate
        );

        if (assocList.length === 0) {
          return of({ assocList, evalMap, userMap: new Map<number, User>() });
        }

        // Step 2: Fetch each user by their userId individually (GET /user/{id} allowed for all roles)
        const uniqueUserIds = [...new Set(assocList.map(a => a.userId))];
        const userRequests = uniqueUserIds.map(uid =>
          this.userSvc.getById(uid).pipe(catchError(() => of(null as User | null)))
        );

        return forkJoin(userRequests).pipe(
          catchError(() => of([] as (User | null)[])),
          switchMap(users => {
            const userMap = new Map<number, User>();
            (users as (User | null)[]).forEach((u, i) => {
              if (u) userMap.set(uniqueUserIds[i], u);
            });
            return of({ assocList, evalMap, userMap });
          })
        );
      })
    ).subscribe({
      next: ({ assocList, evalMap, userMap }) => {
        this.rows = assocList.map(assoc => {
          const user = userMap.get(assoc.userId);
          const enriched: Associate = {
            ...assoc,
            fullName: user?.fullName || user?.username || ('Associate #' + assoc.id)
          };
          return {
            associate:  enriched,
            evaluation: evalMap.get(assoc.id) ?? null
          };
        });
        this.loadingAssociates = false;
      },
      error: () => { this.loadingAssociates = false; }
    });
  }

  startEvaluate(row: AssociateRow): void {
    if (!this.selectedInterview) return;
    this.evaluatingRow = row;
    this.form.patchValue({ evaluatorRemarks: '' });

    this.loadingRubrics = true;
    this.assessmentSvc.getRubrics(this.selectedInterview.id).pipe(catchError(() => of([]))).subscribe(r => {
      this.rubrics = r as Rubric[];
      this.buildRubricForm();
      this.loadingRubrics = false;
      // Scroll to form
      setTimeout(() => document.getElementById('eval-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  }

  cancelEvaluate(): void {
    this.evaluatingRow = null;
    this.rubrics = [];
    this.rubricScores.clear();
  }

  private buildRubricForm(): void {
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
  }

  submit(): void {
    if (this.form.invalid || this.saving || !this.selectedInterview || !this.evaluatingRow) return;
    if (this.rubrics.length === 0) {
      this.snack.open('Cannot evaluate: this interview has no rubrics defined.', 'Close', { duration: 4000 });
      return;
    }
    this.saving = true;

    const v = this.form.value;
    const rubricScoresRaw = v.rubricScores as any[] ?? [];

    const payload: InterviewEvaluationRequest = {
      assessmentId:     this.selectedInterview.id,
      associateId:      this.evaluatingRow.associate.id,
      evaluatorId:      this.auth.getUserId(),
      evaluatorRole:    this.auth.getRole() ?? 'EVALUATOR',
      evaluatorRemarks: v.evaluatorRemarks ?? '',
      rubricScores: rubricScoresRaw.map((rs, i) => {
        const rubric   = this.rubrics[i];
        const weight   = Math.min(100, Math.round(rubric.weight));  // @Max(100) Integer guard
        const awarded  = Math.max(0, Math.min(weight, Math.round(Number(rs.scoreAwarded) || 0)));
        return {
          rubricId:     rubric.id,                               // @NotNull Long — from loaded rubric
          criteria:     rubric.criteria,                         // nullable on backend, always present here
          weight:       weight,                                  // @NotNull @Min(0) @Max(100) Integer
          scoreAwarded: awarded,                                 // @NotNull @Min(0) Integer, clamped to weight
          remarks:      rs.remarks ?? ''
        };
      })
    };

    this.assessmentSvc.submitInterviewEvaluation(payload).subscribe({
      next: result => {
        this.snack.open(
          `✓ ${this.getAssociateName(this.evaluatingRow!.associate)} — ${result.resultStatus} (${result.totalScore}/${result.maxScore})`,
          'Close', { duration: 5000 }
        );
        // Update the row in place
        const idx = this.rows.findIndex(r => r.associate.id === this.evaluatingRow!.associate.id);
        if (idx !== -1) { this.rows[idx] = { ...this.rows[idx], evaluation: result }; }
        this.evaluatingRow = null;
        this.saving = false;
      },
      error: e => {
        const err = e.error;
        let msg: string;
        if (e.status === 403) {
          msg = 'Access denied — your role is not permitted to submit interview evaluations.';
        } else if (e.status === 409) {
          msg = err?.message || 'This associate has already been evaluated for this interview.';
        } else {
          msg = err?.message || 'Failed to submit evaluation';
          if (err?.fieldErrors && typeof err.fieldErrors === 'object') {
            const fields = Object.entries(err.fieldErrors as Record<string, string>)
              .map(([f, m]) => `${f}: ${m}`)
              .join(' | ');
            msg = `${msg} — ${fields}`;
          }
        }
        this.snack.open(msg, 'Close', { duration: 7000 });
        this.saving = false;
      }
    });
  }

  getAssociateName(a: Associate): string {
    return a.fullName || ('Associate #' + a.id);
  }

  getInitial(a: Associate): string {
    return (a.fullName || '?').charAt(0).toUpperCase();
  }
}
