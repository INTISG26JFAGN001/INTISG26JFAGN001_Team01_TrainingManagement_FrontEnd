import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AssessmentService } from '../../../core/services/assessment.service';
import { UserService } from '../../../core/services/user.service';
import { User, Quiz, QuizQuestion } from '../../../core/models';

@Component({
  selector: 'app-quiz-detail-dialog',
  template: `
    <!-- ── Title ── -->
    <h2 mat-dialog-title class="detail-title">
      <mat-icon style="color:var(--accent)">fact_check</mat-icon>
      <span>Quiz Details</span>
      <span class="id-chip">#{{ data.quizId }}</span>
      <span class="status-pill" *ngIf="quiz" [ngClass]="quiz.status.toLowerCase()">{{ quiz.status }}</span>
    </h2>

    <mat-dialog-content class="detail-content">

      <!-- Loading -->
      <div *ngIf="loading" class="loading-center">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading quiz details…</p>
      </div>

      <ng-container *ngIf="!loading && quiz">

        <!-- ── Info strip ── -->
        <div class="info-strip">
          <div class="info-cell">
            <span class="info-label">Title</span>
            <span class="info-value">{{ quiz.title }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Batch</span>
            <span class="info-value"><span class="id-chip">#{{ quiz.batchId }}</span></span>
          </div>
          <div class="info-cell">
            <span class="info-label">Due Date</span>
            <span class="info-value">{{ quiz.dueDate ? (quiz.dueDate | date:'dd MMM yyyy') : '—' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Duration</span>
            <span class="info-value">{{ quiz.durationMinutes ? quiz.durationMinutes + ' mins' : '—' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Passing Marks</span>
            <span class="info-value">{{ quiz.passingMarks ?? '—' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Max Score</span>
            <span class="info-value">{{ quiz.maxScore ?? '—' }}</span>
          </div>
        </div>

        <!-- ── Tabs ── -->
        <mat-tab-group animationDuration="150ms">

          <!-- Questions tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:6px">quiz</mat-icon>
              Questions ({{ quiz.questions?.length ?? 0 }})
            </ng-template>

            <div class="tab-body">
              <div *ngIf="!quiz.questions?.length" class="no-data">No questions available.</div>

              <div class="question-card" *ngFor="let q of quiz.questions; let i = index">
                <div class="q-header">
                  <span class="q-badge">Q{{ i + 1 }}</span>
                  <span class="q-marks">{{ q.marks ?? 1 }} mark{{ (q.marks ?? 1) !== 1 ? 's' : '' }}</span>
                </div>
                <p class="q-text">{{ q.questionText }}</p>
                <div class="options-grid">
                  <div class="option-row" *ngFor="let opt of ['A','B','C','D']"
                       [class.correct]="q.correctOption === opt">
                    <span class="opt-letter" [class.correct]="q.correctOption === opt">{{ opt }}</span>
                    <span class="opt-text">{{ getOption(q, opt) }}</span>
                    <mat-icon *ngIf="q.correctOption === opt" class="correct-icon">check_circle</mat-icon>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Submitted / Results tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:6px">bar_chart</mat-icon>
              Submitted ({{ attempts.length }})
            </ng-template>

            <div class="tab-body">

              <!-- Summary chips -->
              <div class="results-summary" *ngIf="attempts.length > 0">
                <div class="sum-chip">
                  <span class="sum-num">{{ attempts.length }}</span>
                  <span class="sum-lbl">Total</span>
                </div>
                <div class="sum-chip pass">
                  <span class="sum-num">{{ passCount }}</span>
                  <span class="sum-lbl">Passed</span>
                </div>
                <div class="sum-chip fail">
                  <span class="sum-num">{{ attempts.length - passCount }}</span>
                  <span class="sum-lbl">Failed</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-num">{{ avgScore }}</span>
                  <span class="sum-lbl">Avg Score</span>
                </div>
              </div>

              <div *ngIf="attempts.length === 0" class="no-data">No attempts submitted yet.</div>

              <!-- Expandable attempt cards — click to see per-question breakdown -->
              <div class="eval-list" *ngIf="attempts.length > 0">
                <div class="eval-card"
                     *ngFor="let a of attempts"
                     [class.expanded]="selectedAttemptId === a.attemptId"
                     [class.ev-pass]="a.resultStatus === 'PASS'"
                     [class.ev-fail]="a.resultStatus !== 'PASS'">

                  <!-- Header row -->
                  <div class="eval-header" (click)="toggleAttempt(a.attemptId)">
                    <div class="eval-avatar"
                         [class.av-pass]="a.resultStatus === 'PASS'"
                         [class.av-fail]="a.resultStatus !== 'PASS'">
                      {{ getInitial(a.associateId) }}
                    </div>
                    <div class="eval-meta">
                      <span class="eval-name">{{ getName(a.associateId) }}</span>
                      <span class="eval-sub">
                        {{ a.score }} / {{ a.maxScore }}
                        &nbsp;·&nbsp; Pass: {{ a.passingMarks }}
                        &nbsp;·&nbsp; {{ a.submittedAt | date:'dd MMM yyyy' }}
                      </span>
                    </div>
                    <span class="result-pill"
                          [style.background]="a.resultStatus === 'PASS' ? 'rgba(52,211,153,.15)' : 'rgba(239,68,68,.12)'"
                          [style.color]="a.resultStatus === 'PASS' ? '#34d399' : '#ef4444'">
                      {{ a.resultStatus }}
                    </span>
                    <mat-icon class="chevron">{{ selectedAttemptId === a.attemptId ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </div>

                  <!-- Expanded: per-question answer breakdown -->
                  <div class="eval-detail" *ngIf="selectedAttemptId === a.attemptId">
                    <div *ngIf="!quiz?.questions?.length"
                         style="font-size:12px;color:var(--text-muted);padding:8px 0">
                      No answer breakdown available.
                    </div>
                    <table class="rubric-tbl" *ngIf="quiz?.questions?.length">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Question</th>
                          <th>Selected</th>
                          <th>Correct Ans</th>
                          <th>✓/✗</th>
                          <th>Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let row of getFullAnswers(a); let qi = index">
                          <td class="td-center" style="color:var(--text-muted)">{{ qi + 1 }}</td>
                          <td class="td-criteria">{{ row.questionText }}</td>
                          <td class="td-center">
                            <span *ngIf="row.selectedOption"
                                  class="opt-badge"
                                  [style.background]="row.correct ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)'"
                                  [style.color]="row.correct ? '#34d399' : '#ef4444'">
                              {{ row.selectedOption }}
                            </span>
                            <span *ngIf="!row.selectedOption"
                                  style="font-size:11px;color:var(--text-muted);font-style:italic">
                              Not answered
                            </span>
                          </td>
                          <td class="td-center">
                            <span class="opt-badge" style="background:rgba(52,211,153,0.12);color:#34d399">
                              {{ row.correctOption }}
                            </span>
                          </td>
                          <td class="td-center">
                            <mat-icon *ngIf="row.correct"  style="font-size:16px;width:16px;height:16px;color:#34d399">check_circle</mat-icon>
                            <mat-icon *ngIf="!row.correct && row.selectedOption" style="font-size:16px;width:16px;height:16px;color:#ef4444">cancel</mat-icon>
                            <mat-icon *ngIf="!row.selectedOption" style="font-size:16px;width:16px;height:16px;color:var(--text-muted)">remove_circle_outline</mat-icon>
                          </td>
                          <td class="td-center">
                            <span class="score-badge"
                                  [style.background]="row.correct ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)'"
                                  [style.color]="row.correct ? '#34d399' : '#ef4444'">
                              {{ row.marksAwarded ?? 0 }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="totals-row">
                          <td colspan="5"><strong>Total Score</strong></td>
                          <td class="td-center"><strong>{{ a.score }} / {{ a.maxScore }}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                </div>
              </div>

            </div>
          </mat-tab>

        </mat-tab-group>
      </ng-container>

    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:12px 24px">
      <button mat-stroked-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-title { display:flex; align-items:center; gap:8px; font-size:17px; font-weight:600; flex-wrap:wrap; }
    .detail-content { min-width:720px; max-height:75vh; padding:0 24px 8px; }
    .loading-center { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px; gap:12px; color:var(--text-secondary); }

    .info-strip { display:flex; flex-wrap:wrap; gap:0; border:1px solid var(--border,#e0e0e0); border-radius:8px; overflow:hidden; margin-bottom:16px; }
    .info-cell { display:flex; flex-direction:column; gap:2px; padding:10px 16px; flex:1; min-width:100px; border-right:1px solid var(--border,#e0e0e0); background:var(--bg-input,#fafafa); }
    .info-cell:last-child { border-right:none; }
    .info-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#9e9e9e); }
    .info-value { font-size:13px; font-weight:600; color:var(--text-primary,#1a1a1a); }

    .id-chip { display:inline-block; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700; font-family:monospace; background:rgba(0,198,255,.08); color:var(--accent,#00c6ff); border:1px solid rgba(0,198,255,.2); }
    .status-pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
    .status-pill.draft     { background:rgba(251,191,36,.15); color:#fbbf24; }
    .status-pill.published { background:rgba(52,211,153,.15); color:#34d399; }
    .status-pill.closed    { background:rgba(239,68,68,.12);  color:#ef4444; }
    .status-pill.archived  { background:rgba(100,116,139,.12);color:#64748b; }
    .result-pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }

    .tab-body { padding:16px 0 8px; }
    .no-data { text-align:center; padding:32px; color:var(--text-secondary); font-size:13px; }

    /* Question cards */
    .question-card { background:var(--bg-input,#fafafa); border:1px solid var(--border,#e8eaf6); border-radius:10px; padding:14px 16px; margin-bottom:12px; }
    .q-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .q-badge { background:#5c6bc0; color:#fff; font-size:12px; font-weight:700; padding:2px 10px; border-radius:12px; }
    .q-marks { font-size:12px; color:var(--text-secondary); }
    .q-text { font-size:13px; font-weight:600; color:var(--text-primary); margin:0 0 10px; line-height:1.5; }
    .options-grid { display:flex; flex-direction:column; gap:6px; }
    .option-row { display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:6px; border:1px solid var(--border,#e0e0e0); font-size:13px; }
    .option-row.correct { background:rgba(52,211,153,.1); border-color:rgba(52,211,153,.4); }
    .opt-letter { width:22px; height:22px; border-radius:50%; background:var(--bg-input); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--text-secondary); flex-shrink:0; }
    .opt-letter.correct { background:#34d399; border-color:#34d399; color:#fff; }
    .opt-text { flex:1; color:var(--text-primary); }
    .correct-icon { font-size:16px; width:16px; height:16px; color:#34d399; margin-left:auto; }

    /* Summary chips */
    .results-summary { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .sum-chip { display:flex; flex-direction:column; align-items:center; padding:10px 20px; border-radius:8px; background:var(--bg-input,#fafafa); border:1px solid var(--border,#e0e0e0); min-width:80px; }
    .sum-chip.pass { background:rgba(52,211,153,.08); border-color:rgba(52,211,153,.3); }
    .sum-chip.fail { background:rgba(239,68,68,.08);  border-color:rgba(239,68,68,.2); }
    .sum-num { font-size:22px; font-weight:700; color:var(--text-primary); }
    .sum-chip.pass .sum-num { color:#34d399; }
    .sum-chip.fail .sum-num { color:#ef4444; }
    .sum-lbl { font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.5px; }

    /* Expandable attempt cards */
    .eval-list { display:flex; flex-direction:column; gap:8px; }
    .eval-card { border:1px solid var(--border,#e0e0e0); border-radius:10px; overflow:visible; background:var(--bg-card,#fff); transition:border-color .2s ease; }
    .eval-card.ev-pass.expanded { border-color:rgba(52,211,153,.4); border-radius:10px; }
    .eval-card.ev-fail.expanded { border-color:rgba(239,68,68,.35); border-radius:10px; }

    .eval-header { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; user-select:none; border-radius:10px; }
    .eval-card.expanded .eval-header { border-radius:10px 10px 0 0; }
    .eval-header:hover { background:rgba(128,128,128,.06); }

    .eval-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
    .av-pass { background:rgba(52,211,153,.12); color:#34d399; border:1px solid rgba(52,211,153,.3); }
    .av-fail { background:rgba(239,68,68,.10);  color:#ef4444; border:1px solid rgba(239,68,68,.25); }

    .eval-meta { display:flex; flex-direction:column; flex:1; min-width:0; }
    .eval-name { font-size:13px; font-weight:600; color:var(--text-primary); }
    .eval-sub  { font-size:11px; color:var(--text-muted); }
    .chevron   { color:var(--text-muted); flex-shrink:0; font-size:20px; width:20px; height:20px; }

    .eval-detail { padding:10px 14px 14px; border-top:1px solid var(--border,#e0e0e0); max-height:440px; overflow-y:auto; }

    /* Answer breakdown table */
    .rubric-tbl { width:100%; border-collapse:collapse; font-size:12px; table-layout:fixed; }
    .rubric-tbl th { padding:6px 8px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted); border-bottom:1px solid var(--border); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rubric-tbl th:nth-child(1) { width:5%; }
    .rubric-tbl th:nth-child(2) { width:43%; }
    .rubric-tbl th:nth-child(3) { width:12%; text-align:center; }
    .rubric-tbl th:nth-child(4) { width:13%; text-align:center; }
    .rubric-tbl th:nth-child(5) { width:9%; text-align:center; }
    .rubric-tbl th:nth-child(6) { width:10%; text-align:center; }
    .rubric-tbl td { padding:8px 8px; border-bottom:1px solid rgba(128,128,128,.08); vertical-align:middle; }
    .rubric-tbl tbody tr:last-child td { border-bottom:none; }
    .rubric-tbl tfoot td { border-top:1px solid var(--border); font-size:12px; color:var(--text-primary); padding-top:8px; }
    .td-criteria { color:var(--text-primary); font-weight:500; word-break:break-word; white-space:normal; }
    .td-center   { text-align:center; color:var(--text-secondary); }

    .opt-badge { display:inline-block; width:26px; height:26px; border-radius:50%; background:var(--bg-input); border:1px solid var(--border); line-height:24px; text-align:center; font-size:12px; font-weight:700; color:var(--text-primary); }
    .score-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:700; min-width:30px; text-align:center; }
  `]
})
export class QuizDetailDialogComponent implements OnInit {
  quiz: Quiz | null = null;
  attempts: any[] = [];
  loading = true;
  selectedAttemptId: number | null = null;
  private nameMap = new Map<number, string>();

  get passCount(): number { return this.attempts.filter(a => a.resultStatus === 'PASS').length; }
  get avgScore(): string {
    if (!this.attempts.length) return '—';
    const avg = this.attempts.reduce((s, a) => s + (a.score || 0), 0) / this.attempts.length;
    return avg.toFixed(1);
  }

  getOption(q: QuizQuestion, opt: string): string {
    return (q as any)['option' + opt] ?? '';
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { quizId: number; title: string },
    private svc: AssessmentService,
    private userSvc: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    forkJoin({
      quiz:     this.svc.getQuiz(this.data.quizId),
      attempts: this.svc.getQuizAttempts(this.data.quizId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ quiz, attempts }) => {
        this.quiz     = quiz;
        this.attempts = attempts;
        this.loading  = false;
        // Resolve associate names (quiz stores userId as associateId)
        if (attempts.length > 0) {
          this.loadNames(attempts.map((a: any) => a.associateId));
        }
      },
      error: () => { this.loading = false; }
    });
  }

  // Quiz attempts store the USER ID (not the associate entity ID) as associateId.
  // So we resolve names by calling userSvc.getById directly with that ID.
  private loadNames(userIds: number[]): void {
    const uniqueIds = [...new Set(userIds as number[])];
    const userReqs = uniqueIds.map(uid =>
      this.userSvc.getById(uid).pipe(catchError(() => of(null as User | null)))
    );
    forkJoin(userReqs).pipe(catchError(() => of([]))).subscribe((users: any[]) => {
      uniqueIds.forEach((uid, i) => {
        const u = users[i] as User | null;
        if (u) this.nameMap.set(uid, u.fullName || u.username || `User #${uid}`);
      });
      this.cdr.detectChanges();
    });
  }

  getName(associateId: number): string {
    return this.nameMap.get(associateId) || `Associate #${associateId}`;
  }

  getInitial(associateId: number): string {
    return (this.nameMap.get(associateId) || '?').charAt(0).toUpperCase();
  }

  toggleAttempt(attemptId: number): void {
    this.selectedAttemptId = this.selectedAttemptId === attemptId ? null : attemptId;
  }

  /**
   * Merges all quiz questions with the attempt's submitted answers.
   * Questions the associate did not answer are shown as "Not answered".
   *
   * Matching strategy (in order):
   *   1. By questionId  — works when the attempt was submitted with the real DB question ID.
   *   2. By questionText — fallback for legacy attempts that used array-index IDs instead of
   *      the actual DB id (quiz 2+ questions have IDs > 1, so index-based submissions fail).
   */
  getFullAnswers(attempt: any): any[] {
    const questions: any[] = this.quiz?.questions || [];
    const answers: any[]   = attempt.answers || [];

    // Primary index: by actual DB questionId
    const byId   = new Map<number, any>(answers.map((a: any) => [a.questionId, a]));
    // Fallback index: by question text (normalised)
    const byText = new Map<string, any>(
      answers.map((a: any) => [String(a.questionText || '').trim().toLowerCase(), a])
    );

    return questions.map((q: any) => {
      // Try ID match first (correct approach)
      let ans = q.id != null ? byId.get(q.id) : undefined;
      // If not found, try text match (handles index-based legacy attempts)
      if (!ans) {
        ans = byText.get(String(q.questionText || '').trim().toLowerCase());
      }
      if (ans) return ans;
      // Question was not answered at all
      return {
        questionId:     q.id,
        questionText:   q.questionText,
        selectedOption: null,
        correctOption:  q.correctOption,
        correct:        false,
        marksAwarded:   0
      };
    });
  }
}
