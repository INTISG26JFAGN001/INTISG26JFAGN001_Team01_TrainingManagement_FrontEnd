import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AssociateService } from '../../../core/services/associate.service';
import { AuthService } from '../../../core/services/auth.service';
import { Quiz } from '../../../core/models';
import { QuizAttemptDialogComponent } from './quiz-attempt-dialog.component';

interface QuizRow extends Quiz { attempted?: boolean; score?: number; resultStatus?: string; scorePercent?: number | null; }

type TabKey = 'upcoming' | 'completed' | 'missed';

@Component({
  selector: 'app-my-quizzes',
  templateUrl: './my-quizzes.component.html',
  styleUrls: ['./my-quizzes.component.scss']
})
export class MyQuizzesComponent implements OnInit {
  quizzes: QuizRow[] = [];
  loading = true;
  associateId = 0;
  batchId: number | null = null;

  activeTab: TabKey = 'upcoming';

  get upcoming(): QuizRow[] {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.quizzes.filter(q => !q.attempted && q.status !== 'CLOSED' && (!q.dueDate || new Date(q.dueDate) >= today));
  }
  get completed(): QuizRow[] {
    return this.quizzes.filter(q => q.attempted);
  }
  get missed(): QuizRow[] {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.quizzes.filter(q => !q.attempted && (q.status === 'CLOSED' || (q.dueDate && new Date(q.dueDate) < today)));
  }
  get filteredQuizzes(): QuizRow[] {
    if (this.activeTab === 'completed') return this.completed;
    if (this.activeTab === 'missed') return this.missed;
    return this.upcoming;
  }

  selectTab(tab: TabKey): void { this.activeTab = tab; }

  constructor(
    private assessmentSvc: AssessmentService,
    private associateSvc: AssociateService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of({ quizzes: [] as Quiz[], associateId: 0, batchId: null as number | null });
        this.associateId = me.id;
        const directBatchId: number | null = (me.batchId && me.batchId > 0) ? Number(me.batchId) : null;
        const batchId$ = directBatchId
          ? of(directBatchId)
          : this.associateSvc.getMyEnrollment(me.id).pipe(
              catchError(() => of(null)),
              switchMap((raw: any) => {
                const enrollment = Array.isArray(raw) ? (raw[0] ?? null) : raw;
                const bid = enrollment?.batchId ?? null;
                return of(bid && bid > 0 ? Number(bid) : null);
              })
            );
        return batchId$.pipe(
          switchMap((batchId: number | null) => {
            if (!batchId) return of({ quizzes: [] as Quiz[], associateId: me.id, batchId: null as number | null });
            this.batchId = batchId;
            return this.assessmentSvc.getQuizzesByBatch(batchId).pipe(
              catchError(() => of([])),
              switchMap(quizzes => {
                const published = quizzes.filter((q: any) => q.status === 'PUBLISHED' || q.status === 'CLOSED');
                return of({ quizzes: published, associateId: me.id, batchId });
              })
            );
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (res.associateId) this.associateId = res.associateId;
        this.batchId = res.batchId;
        const rows: QuizRow[] = res.quizzes;
        // Fetch results for each quiz in parallel
        if (rows.length === 0) { this.quizzes = []; this.loading = false; return; }
        // Use userId (not associate entity ID) — attempts are stored with userId
        const resultObs: Observable<any>[] = rows.map((q: QuizRow) =>
          this.assessmentSvc.getQuizResult(q.id, userId).pipe(catchError(() => of(null)))
        );
        forkJoin(resultObs).subscribe({
          next: results => {
            results.forEach((r: any, i: number) => {
              if (r) {
                rows[i].attempted = true;
                rows[i].score = r.score;
                rows[i].resultStatus = r.resultStatus;
                const max = rows[i].maxScore ?? null;
                const sc  = r.score ?? null;
                rows[i].scorePercent = (max && sc !== null) ? Math.min(100, Math.round((sc / max) * 100)) : null;
              }
            });
            this.quizzes = rows;
            this.loading = false;
          },
          error: () => { this.quizzes = rows; this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  openQuiz(quiz: QuizRow): void {
    if (quiz.attempted) {
      this.snack.open('You have already attempted this quiz.', 'Close', { duration: 3000 });
      return;
    }
    // Load full quiz with questions
    this.assessmentSvc.getQuiz(quiz.id).subscribe({
      next: fullQuiz => {
        this.dialog.open(QuizAttemptDialogComponent, {
          width: '760px', maxHeight: '90vh', disableClose: true,
          data: { quiz: fullQuiz }
        }).afterClosed().subscribe(submitted => {
          if (submitted) this.ngOnInit();
        });
      },
      error: () => this.snack.open('Failed to load quiz', 'Close', { duration: 3000 })
    });
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { PASS: 'chip-pass', FAIL: 'chip-fail' };
    return map[status] ?? '';
  }

  getScoreBarColor(pct: number): string {
    if (pct >= 70) return '#34d399';
    if (pct >= 50) return '#fbbf24';
    return '#ef4444';
  }
}
