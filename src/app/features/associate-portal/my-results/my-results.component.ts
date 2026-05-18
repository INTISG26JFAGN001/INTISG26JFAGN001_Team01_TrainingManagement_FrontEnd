import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AssociateService } from '../../../core/services/associate.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-results',
  templateUrl: './my-results.component.html',
  styleUrls: ['./my-results.component.scss']
})
export class MyResultsComponent implements OnInit {
  loading = true;
  associateId = 0;
  batchId: number | null = null;

  interviewEvaluations: any[] = [];
  projects: any[] = [];
  overallEvaluation: any = null;

  // Quiz summary
  quizResults: { title: string; score: number; maxScore: number; status: string }[] = [];

  constructor(
    private assessmentSvc: AssessmentService,
    private associateSvc: AssociateService,
    private projectSvc: ProjectService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of(null);
        this.associateId = me.id;
        return this.associateSvc.getMyEnrollment(me.id).pipe(
          catchError(() => of(null)),
          switchMap((raw: any) => {
            const enrollment = Array.isArray(raw) ? (raw[0] ?? null) : raw;
            this.batchId = enrollment?.batchId ?? me.batchId ?? null;
            return forkJoin({
              interviewEvals: this.assessmentSvc.getInterviewEvaluationsByAssociate(me.id).pipe(catchError(() => of([]))),
              projects: this.projectSvc.getProjects().pipe(catchError(() => of([]))),
              quizzes: this.batchId
                ? this.assessmentSvc.getQuizzesByBatch(this.batchId).pipe(catchError(() => of([])))
                : of([]),
              overallEval: this.batchId
                ? this.projectSvc.getAssociateEvaluation(this.batchId, me.id).pipe(catchError(() => of(null)))
                : of(null)
            });
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (!res) { this.loading = false; return; }
        this.interviewEvaluations = res.interviewEvals ?? [];
        this.projects = this.batchId
          ? (res.projects ?? []).filter((p: any) => p.batchId != null && p.batchId === this.batchId)
          : [];
        this.overallEvaluation = res.overallEval;

        // Fetch quiz results for published quizzes
        const publishedQuizzes = (res.quizzes ?? []).filter((q: any) => q.status === 'PUBLISHED');
        if (publishedQuizzes.length === 0) { this.loading = false; return; }

        const resultObs: Observable<any>[] = publishedQuizzes.map((q: any) =>
          this.assessmentSvc.getQuizResult(q.id, this.associateId).pipe(catchError(() => of(null)))
        );
        forkJoin(resultObs).subscribe({
          next: (results: any[]) => {
            this.quizResults = results
              .map((r: any, i: number) => r ? {
                title: publishedQuizzes[i].title,
                score: r.score,
                maxScore: publishedQuizzes[i].maxScore,
                status: r.resultStatus
              } : null)
              .filter(Boolean) as any[];
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  getPassRate(): number {
    if (this.quizResults.length === 0) return 0;
    return Math.round((this.quizResults.filter(q => q.status === 'PASSED').length / this.quizResults.length) * 100);
  }

  getAvgQuizScore(): string {
    if (this.quizResults.length === 0) return '—';
    const total = this.quizResults.reduce((s, q) => s + q.score, 0);
    return (total / this.quizResults.length).toFixed(1);
  }

  getInterviewAvg(): string {
    if (this.interviewEvaluations.length === 0) return '—';
    const total = this.interviewEvaluations.reduce((s, e) => s + (e.totalScore ?? 0), 0);
    return (total / this.interviewEvaluations.length).toFixed(1);
  }
}
