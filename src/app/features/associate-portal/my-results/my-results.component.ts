import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AssociateService } from '../../../core/services/associate.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';

interface QuizResultRow {
  id: number; title: string; dueDate: string | null;
  score: number; maxScore: number | null; scorePercent: number | null; resultStatus: string;
}

interface InterviewResultRow {
  id: number; title: string; category: string;
  evaluatedAt: string; evaluatorRole: string; evaluatorRemarks: string;
  totalScore: number; maxScore: number; scorePercent: number | null; resultStatus: string;
  rubricScores: { criteria: string; scoreAwarded: number; weight: number; remarks: string }[];
  expanded: boolean;
}

interface ProjectResultRow {
  id: number; title: string; repoUrl: string; submissionDate: string | null;
  reviews: { score: number; comments: string; type: string }[];
  avgScore: number | null; expanded: boolean;
}

type TabKey = 'quizzes' | 'interviews' | 'projects';

@Component({
  selector: 'app-my-results',
  templateUrl: './my-results.component.html',
  styleUrls: ['./my-results.component.scss']
})
export class MyResultsComponent implements OnInit {
  loading = true;
  associateId = 0;
  batchId: number | null = null;
  activeTab: TabKey = 'quizzes';

  quizResults: QuizResultRow[] = [];
  interviewResults: InterviewResultRow[] = [];
  projectResults: ProjectResultRow[] = [];

  get quizPassCount(): number { return this.quizResults.filter(q => q.resultStatus === 'PASS').length; }
  get quizPassRate(): number { return this.quizResults.length ? Math.round((this.quizPassCount / this.quizResults.length) * 100) : 0; }
  get interviewAvgScore(): string {
    if (!this.interviewResults.length) return '—';
    const avg = this.interviewResults.reduce((s, i) => s + i.totalScore, 0) / this.interviewResults.length;
    return avg.toFixed(1);
  }

  selectTab(tab: TabKey): void { this.activeTab = tab; }

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

        const directBatchId: number | null = (me.batchId && me.batchId > 0) ? Number(me.batchId) : null;
        const batchId$ = directBatchId
          ? of(directBatchId)
          : this.associateSvc.getMyEnrollment(me.id).pipe(
              catchError(() => of(null)),
              switchMap((raw: any) => {
                const e = Array.isArray(raw) ? (raw[0] ?? null) : raw;
                const bid = e?.batchId ?? null;
                return of(bid && bid > 0 ? Number(bid) : null);
              })
            );

        return batchId$.pipe(
          switchMap((batchId: number | null) => {
            if (!batchId) return of(null);
            this.batchId = batchId;

            return forkJoin({
              quizzes:        this.assessmentSvc.getQuizzesByBatch(batchId).pipe(catchError(() => of([]))),
              interviews:     this.assessmentSvc.getInterviewsByBatch(batchId).pipe(catchError(() => of([]))),
              interviewEvals: this.assessmentSvc.getInterviewEvaluationsByAssociate(me.id).pipe(catchError(() => of([]))),
              projects:       this.projectSvc.getProjects().pipe(catchError(() => of([])))
            }).pipe(
              switchMap((res: any) => {
                const publishedQuizzes = (res.quizzes as any[]).filter((q: any) =>
                  q.status === 'PUBLISHED' || q.status === 'CLOSED'
                );

                const myProjects = (res.projects as any[]).filter((p: any) => p.batchId === batchId);

                const quizResultObs: Observable<any>[] = publishedQuizzes.map((q: any) =>
                  this.assessmentSvc.getQuizResult(q.id, userId).pipe(catchError(() => of(null)))
                );
                const reviewObs: Observable<any>[] = myProjects.map((p: any) =>
                  this.projectSvc.getReviews(p.id).pipe(catchError(() => of([])))
                );

                return forkJoin([
                  publishedQuizzes.length ? forkJoin(quizResultObs) : of([]),
                  myProjects.length       ? forkJoin(reviewObs)     : of([])
                ]).pipe(
                  switchMap(([quizResultsList, reviewsList]: [any[], any[]]) =>
                    of({ ...res, publishedQuizzes, quizResultsList, myProjects, reviewsList })
                  )
                );
              })
            );
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (!res) { this.loading = false; return; }

        // Quiz results
        this.quizResults = (res.quizResultsList as any[])
          .map((r: any, i: number): QuizResultRow | null => {
            if (!r) return null;
            const q = res.publishedQuizzes[i];
            const max = q.maxScore ?? null;
            const sc  = r.score ?? 0;
            return {
              id: q.id, title: q.title, dueDate: q.dueDate ?? null,
              score: sc, maxScore: max,
              scorePercent: max ? Math.min(100, Math.round((sc / max) * 100)) : null,
              resultStatus: r.resultStatus ?? '—'
            };
          })
          .filter((r): r is QuizResultRow => r !== null);

        // Interview results
        const ivMap = new Map<number, any>();
        (res.interviews as any[]).forEach((iv: any) => ivMap.set(iv.id, iv));
        this.interviewResults = (res.interviewEvals as any[]).map((e: any): InterviewResultRow => {
          const iv  = ivMap.get(e.assessmentId) ?? null;
          const max = e.maxScore ?? 0;
          const sc  = e.totalScore ?? 0;
          return {
            id: e.id,
            title: iv?.title ?? `Interview #${e.assessmentId}`,
            category: iv?.interviewCategory ?? iv?.category ?? 'GENERAL',
            evaluatedAt: e.evaluatedAt,
            evaluatorRole: e.evaluatorRole ?? 'Evaluator',
            evaluatorRemarks: e.evaluatorRemarks ?? '',
            totalScore: sc, maxScore: max,
            scorePercent: max ? Math.min(100, Math.round((sc / max) * 100)) : null,
            resultStatus: e.resultStatus ?? '—',
            rubricScores: e.rubricScores ?? [],
            expanded: false
          };
        });

        // Project results
        this.projectResults = (res.myProjects as any[]).map((p: any, i: number): ProjectResultRow => {
          const reviews: any[] = res.reviewsList[i] ?? [];
          const avgScore = reviews.length
            ? Math.round(reviews.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / reviews.length * 10) / 10
            : null;
          return {
            id: p.id, title: p.title, repoUrl: p.repoUrl,
            submissionDate: p.submissionDate ?? null,
            reviews, avgScore, expanded: false
          };
        });

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleExpand(item: InterviewResultRow | ProjectResultRow): void { item.expanded = !item.expanded; }

  getScoreBarColor(pct: number): string {
    if (pct >= 70) return '#34d399';
    if (pct >= 50) return '#fbbf24';
    return '#ef4444';
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = { INTERIM: 'Interim', FINAL: 'Final', GENERAL: 'General' };
    return map[cat] ?? cat;
  }

  getCategoryClass(cat: string): string {
    const map: Record<string, string> = { INTERIM: 'cat-interim', FINAL: 'cat-final', GENERAL: 'cat-general' };
    return map[cat] ?? 'cat-general';
  }

  getResultClass(status: string): string {
    const map: Record<string, string> = { PASS: 'chip-pass', FAIL: 'chip-fail' };
    return map[status] ?? '';
  }
}
