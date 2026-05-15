import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AssessmentService } from '../../../core/services/assessment.service';

@Component({
  selector: 'app-quiz-results-dialog',
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px">
      <mat-icon style="color:var(--accent)">fact_check</mat-icon>
      Quiz Results
      <span style="font-size:14px;font-weight:400;color:var(--text-secondary);margin-left:4px">— {{ data.title }}</span>
    </h2>

    <mat-dialog-content style="min-width:560px;max-height:60vh;padding:0 24px 8px">
      <div *ngIf="loading" style="display:flex;justify-content:center;padding:48px">
        <mat-spinner diameter="36"></mat-spinner>
      </div>

      <div *ngIf="!loading && results.length === 0"
           style="text-align:center;padding:40px;color:var(--text-secondary);font-size:13px">
        No attempts found for this quiz yet.
      </div>

      <div *ngIf="!loading && results.length > 0">
        <div style="display:flex;align-items:center;gap:16px;padding:12px 0 8px;margin-bottom:4px;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;color:var(--text-secondary)">
            Total attempts: <strong style="color:var(--text-primary)">{{ results.length }}</strong>
          </span>
          <span style="font-size:12px;color:var(--text-secondary)">
            Passed: <strong style="color:#34d399">{{ passCount }}</strong>
          </span>
          <span style="font-size:12px;color:var(--text-secondary)">
            Failed: <strong style="color:#ef4444">{{ results.length - passCount }}</strong>
          </span>
        </div>

        <table mat-table [dataSource]="results" style="width:100%;background:transparent">
          <ng-container matColumnDef="attemptId">
            <th mat-header-cell *matHeaderCellDef style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary)">Attempt</th>
            <td mat-cell *matCellDef="let r"><span class="id-chip">#{{ r.attemptId }}</span></td>
          </ng-container>

          <ng-container matColumnDef="associateId">
            <th mat-header-cell *matHeaderCellDef style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary)">Associate</th>
            <td mat-cell *matCellDef="let r"><span class="id-chip">#{{ r.associateId }}</span></td>
          </ng-container>

          <ng-container matColumnDef="score">
            <th mat-header-cell *matHeaderCellDef style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary)">Score</th>
            <td mat-cell *matCellDef="let r" style="font-weight:600;color:var(--text-primary)">
              {{ r.score }} / {{ r.maxScore }}
              <span style="font-size:11px;color:var(--text-secondary);margin-left:4px">(passing: {{ r.passingMarks }})</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="result">
            <th mat-header-cell *matHeaderCellDef style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary)">Result</th>
            <td mat-cell *matCellDef="let r">
              <span class="result-pill"
                    [style.background]="r.resultStatus === 'PASS' ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)'"
                    [style.color]="r.resultStatus === 'PASS' ? '#34d399' : '#ef4444'">
                {{ r.resultStatus }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="submittedAt">
            <th mat-header-cell *matHeaderCellDef style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary)">Submitted</th>
            <td mat-cell *matCellDef="let r" style="font-size:12px;color:var(--text-secondary)">
              {{ r.submittedAt | date:'dd MMM yyyy, HH:mm' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"
              style="border-bottom:1px solid var(--border)"></tr>
        </table>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:12px 24px">
      <button mat-stroked-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .id-chip {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 700; font-family: monospace;
      background: rgba(0,198,255,0.08); color: var(--accent);
      border: 1px solid rgba(0,198,255,0.2);
    }
    .result-pill {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    }
    ::ng-deep .mat-mdc-row { border-bottom: 1px solid var(--border) !important; }
    ::ng-deep .mat-mdc-row:last-child { border-bottom: none !important; }
  `]
})
export class QuizResultsDialogComponent implements OnInit {
  results: any[] = [];
  loading = true;
  cols = ['attemptId', 'associateId', 'score', 'result', 'submittedAt'];

  get passCount(): number { return this.results.filter(r => r.resultStatus === 'PASS').length; }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { quizId: number; title: string },
    private svc: AssessmentService
  ) {}

  ngOnInit(): void {
    this.svc.getQuizAttempts(this.data.quizId).subscribe({
      next: r => { this.results = r; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
