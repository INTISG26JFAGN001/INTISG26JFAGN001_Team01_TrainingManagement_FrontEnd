import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AuthService } from '../../../core/services/auth.service';
import { Quiz } from '../../../core/models';

interface AnswerMap { [questionId: number]: string; }

@Component({
  selector: 'app-quiz-attempt-dialog',
  template: `
    <h2 mat-dialog-title><mat-icon>fact_check</mat-icon> {{ quiz.title }}</h2>

    <!-- Timer + info bar -->
    <div class="quiz-meta">
      <span class="meta-chip"><mat-icon>timer</mat-icon> {{ formatTime(remaining) }}</span>
      <span class="meta-chip"><mat-icon>help_outline</mat-icon> {{ quiz.questions.length }} Questions</span>
      <span class="meta-chip" *ngIf="quiz.passingMarks"><mat-icon>flag</mat-icon> Pass: {{ quiz.passingMarks }}</span>
    </div>

    <!-- Result view -->
    <mat-dialog-content *ngIf="result; else quizForm" class="result-view">
      <div class="result-banner" [ngClass]="result.resultStatus === 'PASS' ? 'result-pass' : 'result-fail'">
        <mat-icon>{{ result.resultStatus === 'PASS' ? 'check_circle' : 'cancel' }}</mat-icon>
        <div>
          <h3>{{ result.resultStatus === 'PASS' ? 'Congratulations!' : 'Better luck next time!' }}</h3>
          <p>Score: <strong>{{ result.score }}</strong> / {{ quiz.maxScore }}</p>
          <p>Status: <strong>{{ result.resultStatus }}</strong></p>
        </div>
      </div>
    </mat-dialog-content>

    <!-- Quiz form -->
    <ng-template #quizForm>
      <mat-dialog-content class="quiz-content">
        <div class="question-block" *ngFor="let q of quiz.questions; let i = index">
          <p class="question-text"><strong>{{ i + 1 }}.</strong> {{ q.questionText }}</p>
          <mat-radio-group [(ngModel)]="answers[q.id!]" class="options-group">
            <mat-radio-button value="A" class="option-btn">A. {{ q.optionA }}</mat-radio-button>
            <mat-radio-button value="B" class="option-btn">B. {{ q.optionB }}</mat-radio-button>
            <mat-radio-button value="C" class="option-btn">C. {{ q.optionC }}</mat-radio-button>
            <mat-radio-button value="D" class="option-btn">D. {{ q.optionD }}</mat-radio-button>
          </mat-radio-group>
        </div>
      </mat-dialog-content>
    </ng-template>

    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="!!result">{{ result ? 'Close' : 'Cancel' }}</button>
      <button *ngIf="!result" mat-flat-button color="primary" (click)="submit()" [disabled]="submitting">
        {{ submitting ? 'Submitting...' : 'Submit Quiz' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 8px; }
    .quiz-meta { display: flex; gap: 12px; padding: 8px 24px; background: #f5f5f5; border-bottom: 1px solid #e0e0e0; }
    .meta-chip { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; }
    .meta-chip mat-icon { font-size: 16px; height: 16px; width: 16px; }
    .quiz-content { max-height: 60vh; overflow-y: auto; padding: 16px 24px; }
    .question-block { margin-bottom: 24px; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa; }
    .question-text { margin: 0 0 12px; font-size: 15px; line-height: 1.5; }
    .options-group { display: flex; flex-direction: column; gap: 8px; }
    .option-btn { display: flex; }
    .result-view { padding: 24px; }
    .result-banner { display: flex; align-items: center; gap: 16px; padding: 24px; border-radius: 12px; }
    .result-banner mat-icon { font-size: 48px; height: 48px; width: 48px; }
    .result-banner h3 { margin: 0 0 4px; font-size: 20px; }
    .result-banner p { margin: 4px 0; }
    .result-pass { background: #e8f5e9; color: #1b5e20; }
    .result-fail { background: #ffebee; color: #b71c1c; }
  `]
})
export class QuizAttemptDialogComponent implements OnInit, OnDestroy {
  quiz: Quiz;
  answers: AnswerMap = {};
  submitting = false;
  result: any = null;
  remaining = 0;
  private timer: any;
  private associateId = 0;

  constructor(
    private svc: AssessmentService,
    private auth: AuthService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<QuizAttemptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { quiz: Quiz }
  ) {
    this.quiz = data.quiz;
    this.remaining = (this.quiz.durationMinutes ?? 30) * 60;
  }

  ngOnInit(): void {
    this.associateId = this.auth.getUserId();
    this.startTimer();
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.remaining--;
      if (this.remaining <= 0) { clearInterval(this.timer); this.submit(); }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  submit(): void {
    if (this.submitting || this.result) return;
    this.submitting = true;
    clearInterval(this.timer);
    const answers = this.quiz.questions.map(q => ({
      questionId: q.id,
      selectedOption: this.answers[q.id!] ?? null
    }));
    const payload = { associateId: this.associateId, answers };
    this.svc.submitQuizAttempt(this.quiz.id, payload).subscribe({
      next: (res) => {
        this.result = res;
        this.submitting = false;
      },
      error: (e) => {
        this.snack.open(e.error?.message || 'Submission failed', 'Close', { duration: 4000 });
        this.submitting = false;
      }
    });
  }
}
