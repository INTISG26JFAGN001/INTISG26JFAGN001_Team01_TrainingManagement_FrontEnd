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

interface QuizRow extends Quiz { attempted?: boolean; score?: number; resultStatus?: string; }

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
        return this.associateSvc.getMyEnrollment(me.id).pipe(
          catchError(() => of(null)),
          switchMap((enrollment: any) => {
            const batchId: number | null = enrollment?.batchId ?? me.batchId ?? null;
            if (!batchId) return of({ quizzes: [] as Quiz[], associateId: me.id, batchId: null as number | null });
            this.batchId = batchId;
            return this.assessmentSvc.getQuizzesByBatch(batchId).pipe(
              catchError(() => of([])),
              switchMap(quizzes => {
                const published = quizzes.filter((q: any) => q.status === 'PUBLISHED');
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
        // catchError per quiz: 404 means not attempted yet — treat as null result
        const resultObs: Observable<any>[] = rows.map((q: QuizRow) =>
          this.assessmentSvc.getQuizResult(q.id, res.associateId).pipe(catchError(() => of(null)))
        );
        forkJoin(resultObs).subscribe({
          next: results => {
            results.forEach((r: any, i: number) => {
              if (r) {
                rows[i].attempted = true;
                rows[i].score = r.score;
                rows[i].resultStatus = r.resultStatus;
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
    const map: Record<string, string> = { PASSED: 'chip-pass', FAILED: 'chip-fail' };
    return map[status] ?? '';
  }
}
