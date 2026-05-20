import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AuthService } from '../../../core/services/auth.service';

interface LeaderboardEntry {
  rank: number;
  associateId: number;
  fullName: string;
  email: string;
  quizXp: number;
  interviewXp: number;
  totalXp: number;
  isCurrentUser: boolean;
}

@Component({
  selector: 'app-my-leaderboard',
  templateUrl: './my-leaderboard.component.html',
  styleUrls: ['./my-leaderboard.component.scss']
})
export class MyLeaderboardComponent implements OnInit {
  loading = true;
  batchId: number | null = null;
  currentAssociateId = 0;
  entries: LeaderboardEntry[] = [];
  displayedColumns = ['rank', 'name', 'quizXp', 'interviewXp', 'totalXp'];

  constructor(
    private associateSvc: AssociateService,
    private assessmentSvc: AssessmentService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of(null);
        this.currentAssociateId = me.id;
        return this.associateSvc.getMyEnrollment(me.id).pipe(
          catchError(() => of(null)),
          switchMap((raw: any) => {
            const enrollment = Array.isArray(raw) ? (raw[0] ?? null) : raw;
            const batchId: number | null = enrollment?.batchId ?? me.batchId ?? null;
            if (!batchId) return of(null);
            this.batchId = batchId;
            return forkJoin({
              associates: this.associateSvc.getByBatch(batchId).pipe(catchError(() => of([]))),
              quizzes: this.assessmentSvc.getQuizzesByBatch(batchId).pipe(catchError(() => of([]))),
              interviews: this.assessmentSvc.getInterviewsByBatch(batchId).pipe(catchError(() => of([])))
            });
          })
        );
      }),
      switchMap((data: any) => {
        if (!data) return of(null);
        const { associates, quizzes, interviews } = data;

        const publishedQuizzes = (quizzes as any[]).filter((q: any) => q.status === 'PUBLISHED');
        const publishedInterviews = (interviews as any[]).filter((i: any) => i.status === 'PUBLISHED');

        const quizObs = publishedQuizzes.length
          ? forkJoin(publishedQuizzes.map((q: any) =>
              this.assessmentSvc.getQuizAttempts(q.id).pipe(catchError(() => of([])))
            ))
          : of([] as any[][]);

        const interviewObs = publishedInterviews.length
          ? forkJoin(publishedInterviews.map((i: any) =>
              this.assessmentSvc.getEvaluationsByAssessment(i.id).pipe(catchError(() => of([])))
            ))
          : of([] as any[][]);

        return forkJoin({ quizAttempts: quizObs, interviewEvals: interviewObs }).pipe(
          switchMap((results: any) => of({ associates, ...results }))
        );
      })
    ).subscribe({
      next: (data: any) => {
        if (!data) { this.loading = false; return; }

        const { associates, quizAttempts, interviewEvals } = data;
        const xpMap: Record<number, { quizXp: number; interviewXp: number }> = {};
        for (const a of associates) xpMap[a.id] = { quizXp: 0, interviewXp: 0 };

        for (const attempts of (quizAttempts as any[][])) {
          for (const attempt of attempts) {
            if (xpMap[attempt.associateId] !== undefined) {
              xpMap[attempt.associateId].quizXp += attempt.score ?? 0;
            }
          }
        }

        for (const evals of (interviewEvals as any[][])) {
          for (const e of evals) {
            if (xpMap[e.associateId] !== undefined) {
              xpMap[e.associateId].interviewXp += e.totalScore ?? 0;
            }
          }
        }

        const unsorted: LeaderboardEntry[] = (associates as any[]).map((a: any) => ({
          rank: 0,
          associateId: a.id,
          fullName: a.fullName || a.email || `Associate #${a.id}`,
          email: a.email || '',
          quizXp: xpMap[a.id]?.quizXp ?? 0,
          interviewXp: xpMap[a.id]?.interviewXp ?? 0,
          totalXp: (xpMap[a.id]?.quizXp ?? 0) + (xpMap[a.id]?.interviewXp ?? 0),
          isCurrentUser: a.id === this.currentAssociateId
        }));

        unsorted.sort((a, b) => b.totalXp - a.totalXp);
        this.entries = unsorted.map((e, i) => ({ ...e, rank: i + 1 }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getMedalIcon(rank: number): string {
    if (rank === 1) return 'emoji_events';
    if (rank === 2) return 'military_tech';
    if (rank === 3) return 'workspace_premium';
    return '';
  }

  getMedalClass(rank: number): string {
    if (rank === 1) return 'medal-gold';
    if (rank === 2) return 'medal-silver';
    if (rank === 3) return 'medal-bronze';
    return '';
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
