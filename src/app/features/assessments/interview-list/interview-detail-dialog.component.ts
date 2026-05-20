import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AssessmentService, InterviewEvaluationResponse } from '../../../core/services/assessment.service';
import { AssociateService } from '../../../core/services/associate.service';
import { UserService } from '../../../core/services/user.service';
import { Associate, User, Interview, Rubric } from '../../../core/models';

@Component({
  selector: 'app-interview-detail-dialog',
  template: `
    <!-- ── Title ── -->
    <h2 mat-dialog-title class="detail-title">
      <mat-icon style="color:#a78bfa">record_voice_over</mat-icon>
      <span>Interview Details</span>
      <span class="id-chip">#{{ data.interviewId }}</span>
      <span class="status-pill" *ngIf="interview" [ngClass]="interview.status.toLowerCase()">{{ interview.status }}</span>
    </h2>

    <mat-dialog-content class="detail-content">

      <!-- Loading -->
      <div *ngIf="loading" class="loading-center">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading interview details…</p>
      </div>

      <ng-container *ngIf="!loading && interview">

        <!-- ── Info strip ── -->
        <div class="info-strip">
          <div class="info-cell">
            <span class="info-label">Title</span>
            <span class="info-value">{{ interview.title }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Batch</span>
            <span class="info-value"><span class="id-chip">#{{ interview.batchId }}</span></span>
          </div>
          <div class="info-cell">
            <span class="info-label">Category</span>
            <span class="info-value">
              <span class="category-chip"
                    [class.interim]="interview.interviewCategory === 'INTERIM'"
                    [class.final]="interview.interviewCategory === 'FINAL'">
                {{ interview.interviewCategory || '—' }}
              </span>
            </span>
          </div>
          <div class="info-cell">
            <span class="info-label">Due Date</span>
            <span class="info-value">{{ interview.dueDate ? (interview.dueDate | date:'dd MMM yyyy') : '—' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Max Score</span>
            <span class="info-value">{{ interview.maxScore ?? '—' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Rubrics</span>
            <span class="info-value">{{ rubrics.length }}</span>
          </div>
        </div>

        <!-- ── Tabs ── -->
        <mat-tab-group animationDuration="150ms">

          <!-- Rubrics tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:6px">list_alt</mat-icon>
              Rubrics ({{ rubrics.length }})
            </ng-template>

            <div class="tab-body">
              <div *ngIf="!rubrics.length" class="no-data">No rubrics defined for this interview.</div>

              <div class="rubric-card" *ngFor="let r of rubrics; let i = index">
                <div class="rubric-header">
                  <span class="rubric-badge">{{ i + 1 }}</span>
                  <span class="rubric-criteria">{{ r.criteria }}</span>
                  <span class="rubric-weight">Weight: <strong>{{ r.weight }}</strong></span>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Results / Evaluations tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:6px">bar_chart</mat-icon>
              Results ({{ evaluations.length }})
            </ng-template>

            <div class="tab-body">

              <!-- Summary chips -->
              <div class="results-summary" *ngIf="evaluations.length > 0">
                <div class="sum-chip">
                  <span class="sum-num">{{ evaluations.length }}</span>
                  <span class="sum-lbl">Total</span>
                </div>
                <div class="sum-chip pass">
                  <span class="sum-num">{{ passCount }}</span>
                  <span class="sum-lbl">Passed</span>
                </div>
                <div class="sum-chip fail">
                  <span class="sum-num">{{ evaluations.length - passCount }}</span>
                  <span class="sum-lbl">Failed</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-num">{{ avgScore }}</span>
                  <span class="sum-lbl">Avg Score</span>
                </div>
              </div>

              <div *ngIf="evaluations.length === 0" class="no-data">No evaluations recorded yet.</div>

              <!-- Expandable evaluation cards -->
              <div class="eval-list" *ngIf="evaluations.length > 0">
                <div class="eval-card"
                     *ngFor="let e of evaluations"
                     [class.expanded]="selectedEvalId === e.id"
                     [class.ev-pass]="e.resultStatus === 'PASS'"
                     [class.ev-fail]="e.resultStatus !== 'PASS'">

                  <!-- Header row — click to expand/collapse -->
                  <div class="eval-header" (click)="toggleEval(e.id)">
                    <div class="eval-avatar"
                         [class.av-pass]="e.resultStatus === 'PASS'"
                         [class.av-fail]="e.resultStatus !== 'PASS'">
                      {{ getInitial(e.associateId) }}
                    </div>
                    <div class="eval-meta">
                      <span class="eval-name">{{ getName(e.associateId) }}</span>
                      <span class="eval-sub">{{ e.totalScore }} / {{ e.maxScore }} &nbsp;·&nbsp; {{ e.evaluatedAt | date:'dd MMM yyyy' }}</span>
                    </div>
                    <span class="result-pill"
                          [style.background]="e.resultStatus === 'PASS' ? 'rgba(52,211,153,.15)' : 'rgba(239,68,68,.12)'"
                          [style.color]="e.resultStatus === 'PASS' ? '#34d399' : '#ef4444'">
                      {{ e.resultStatus }}
                    </span>
                    <span class="eval-role" *ngIf="e.evaluatorRole">{{ e.evaluatorRole }}</span>
                    <mat-icon class="chevron">{{ selectedEvalId === e.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </div>

                  <!-- Expanded rubric detail -->
                  <div class="eval-detail" *ngIf="selectedEvalId === e.id">

                    <div *ngIf="!e.rubricScores || e.rubricScores.length === 0"
                         style="font-size:12px;color:var(--text-muted);padding:8px 0">
                      No rubric scores recorded.
                    </div>

                    <table class="rubric-tbl" *ngIf="e.rubricScores && e.rubricScores.length > 0">
                      <thead>
                        <tr>
                          <th>Criteria</th>
                          <th>Score</th>
                          <th>Max</th>
                          <th>%</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let rs of e.rubricScores">
                          <td class="td-criteria">{{ rs.criteria }}</td>
                          <td>
                            <span class="score-badge"
                                  [style.background]="scoreBg(rs.scoreAwarded, rs.weight)"
                                  [style.color]="scoreClr(rs.scoreAwarded, rs.weight)">
                              {{ rs.scoreAwarded }}
                            </span>
                          </td>
                          <td class="td-center">{{ rs.weight }}</td>
                          <td class="td-center">{{ rubricPct(rs.scoreAwarded, rs.weight) }}%</td>
                          <td class="td-remarks">{{ rs.remarks || '—' }}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="totals-row">
                          <td colspan="2"><strong>Total &nbsp; {{ e.totalScore }} / {{ e.maxScore }}</strong></td>
                          <td class="td-center"><strong>{{ pct(e) }}%</strong></td>
                          <td colspan="2"></td>
                        </tr>
                      </tfoot>
                    </table>

                    <div class="score-bar-track" *ngIf="e.rubricScores && e.rubricScores.length > 0">
                      <div class="score-bar-fill"
                           [style.width.%]="pct(e)"
                           [style.background]="pct(e) >= 60 ? '#34d399' : '#ef4444'">
                      </div>
                    </div>

                    <!-- Evaluator remarks — below table -->
                    <div class="eval-remarks-block" *ngIf="e.evaluatorRemarks">
                      <div class="remarks-lbl">
                        <mat-icon>chat_bubble_outline</mat-icon>
                        <span>Evaluator Remarks</span>
                      </div>
                      <p class="remarks-txt">{{ e.evaluatorRemarks }}</p>
                    </div>

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
    .detail-content { min-width:680px; max-height:75vh; padding:0 24px 8px; }
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
    .category-chip { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; }
    .category-chip.interim { background:rgba(99,102,241,.12); color:#818cf8; }
    .category-chip.final   { background:rgba(239,68,68,.12);  color:#ef4444; }

    .tab-body { padding:16px 0 8px; }
    .no-data { text-align:center; padding:32px; color:var(--text-secondary); font-size:13px; }

    .rubric-card { background:var(--bg-input,#fafafa); border:1px solid var(--border,#e8eaf6); border-radius:10px; padding:12px 16px; margin-bottom:10px; }
    .rubric-header { display:flex; align-items:center; gap:10px; }
    .rubric-badge { background:#a78bfa; color:#fff; font-size:12px; font-weight:700; padding:2px 10px; border-radius:12px; flex-shrink:0; }
    .rubric-criteria { font-size:14px; font-weight:600; color:var(--text-primary); flex:1; }
    .rubric-weight { font-size:12px; color:var(--text-secondary); white-space:nowrap; }
    .rubric-weight strong { color:var(--text-primary); }

    .results-summary { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .sum-chip { display:flex; flex-direction:column; align-items:center; padding:10px 20px; border-radius:8px; background:var(--bg-input,#fafafa); border:1px solid var(--border,#e0e0e0); min-width:80px; }
    .sum-chip.pass { background:rgba(52,211,153,.08); border-color:rgba(52,211,153,.3); }
    .sum-chip.fail { background:rgba(239,68,68,.08);  border-color:rgba(239,68,68,.2); }
    .sum-num { font-size:22px; font-weight:700; color:var(--text-primary); }
    .sum-chip.pass .sum-num { color:#34d399; }
    .sum-chip.fail .sum-num { color:#ef4444; }
    .sum-lbl { font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.5px; }

    .eval-list { display:flex; flex-direction:column; gap:8px; }
    .eval-card { border:1px solid var(--border,#e0e0e0); border-radius:10px; overflow:hidden; background:var(--bg-card,#fff); transition:border-color .2s ease; }
    .eval-card.ev-pass.expanded { border-color:rgba(52,211,153,.4); }
    .eval-card.ev-fail.expanded { border-color:rgba(239,68,68,.35); }

    .eval-header { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; user-select:none; }
    .eval-header:hover { background:rgba(128,128,128,.06); }

    .eval-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
    .av-pass { background:rgba(52,211,153,.12); color:#34d399; border:1px solid rgba(52,211,153,.3); }
    .av-fail { background:rgba(239,68,68,.10);  color:#ef4444; border:1px solid rgba(239,68,68,.25); }

    .eval-meta { display:flex; flex-direction:column; flex:1; min-width:0; }
    .eval-name { font-size:13px; font-weight:600; color:var(--text-primary); }
    .eval-sub  { font-size:11px; color:var(--text-muted); }
    .eval-role { font-size:11px; color:var(--text-muted); white-space:nowrap; }
    .chevron   { color:var(--text-muted); flex-shrink:0; font-size:20px; width:20px; height:20px; }

    .eval-detail { padding:10px 14px 14px; border-top:1px solid var(--border,#e0e0e0); }

    .eval-remarks-block { margin-top:12px; padding:10px 12px; border-radius:8px; background:var(--bg-input,#fafafa); border:1px solid var(--border,#e0e0e0); }
    .remarks-lbl { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted); margin-bottom:6px; }
    .remarks-lbl mat-icon { font-size:14px; width:14px; height:14px; color:var(--accent); }
    .remarks-txt { font-size:12px; color:var(--text-secondary); white-space:pre-wrap; word-break:break-word; margin:0; line-height:1.6; }

    .rubric-tbl { width:100%; border-collapse:collapse; font-size:12px; }
    .rubric-tbl th { padding:6px 8px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted); border-bottom:1px solid var(--border); }
    .rubric-tbl td { padding:8px 8px; border-bottom:1px solid rgba(128,128,128,.08); vertical-align:middle; }
    .rubric-tbl tbody tr:last-child td { border-bottom:none; }
    .rubric-tbl tfoot td { border-top:1px solid var(--border); font-size:12px; color:var(--text-primary); padding-top:8px; }
    .td-criteria { color:var(--text-primary); font-weight:500; }
    .td-center   { text-align:center; color:var(--text-secondary); }
    .td-remarks  { color:var(--text-muted); font-size:11px; white-space:pre-wrap; word-break:break-word; min-width:100px; }

    .score-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:700; min-width:30px; text-align:center; }
    .score-bar-track { margin-top:10px; height:5px; border-radius:3px; background:var(--border,#e0e0e0); overflow:hidden; }
    .score-bar-fill  { height:100%; border-radius:3px; transition:width .4s ease; }
  `]
})
export class InterviewDetailDialogComponent implements OnInit {
  interview: Interview | null = null;
  rubrics: Rubric[] = [];
  evaluations: InterviewEvaluationResponse[] = [];
  loading = true;
  selectedEvalId: number | null = null;
  private nameMap = new Map<number, string>();

  get passCount(): number { return this.evaluations.filter(e => e.resultStatus === 'PASS').length; }
  get avgScore(): string {
    if (!this.evaluations.length) return '—';
    const avg = this.evaluations.reduce((s, e) => s + (e.totalScore || 0), 0) / this.evaluations.length;
    return avg.toFixed(1);
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { interviewId: number; title: string },
    private svc: AssessmentService,
    private associateSvc: AssociateService,
    private userSvc: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    forkJoin({
      interview:   this.svc.getInterviewDetail(this.data.interviewId),
      rubrics:     this.svc.getRubrics(this.data.interviewId).pipe(catchError(() => of([]))),
      evaluations: this.svc.getEvaluationsByAssessment(this.data.interviewId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ interview, rubrics, evaluations }) => {
        this.interview   = interview;
        this.rubrics     = rubrics as any[];
        this.evaluations = evaluations as InterviewEvaluationResponse[];
        this.loading     = false;
        if (this.evaluations.length > 0) {
          this.loadNames(this.evaluations.map(e => e.associateId));
        }
      },
      error: () => { this.loading = false; }
    });
  }

  private loadNames(associateIds: number[]): void {
    this.associateSvc.getAll().pipe(catchError(() => of([]))).subscribe((associates: any[]) => {
      const assocMap = new Map<number, Associate>((associates as Associate[]).map(a => [a.id, a]));
      const pairs: { assocId: number; userId: number }[] = [];
      associateIds.forEach(aId => {
        const assoc = assocMap.get(aId);
        if (assoc?.userId) pairs.push({ assocId: aId, userId: assoc.userId });
      });
      if (pairs.length === 0) return;
      const userReqs = pairs.map(p =>
        this.userSvc.getById(p.userId).pipe(catchError(() => of(null as User | null)))
      );
      forkJoin(userReqs).pipe(catchError(() => of([]))).subscribe((users: any[]) => {
        pairs.forEach((p, i) => {
          const u = users[i] as User | null;
          if (u) this.nameMap.set(p.assocId, u.fullName || u.username || `Associate #${p.assocId}`);
        });
        this.cdr.detectChanges();
      });
    });
  }

  getName(associateId: number): string {
    return this.nameMap.get(associateId) || `Associate #${associateId}`;
  }

  getInitial(associateId: number): string {
    return (this.nameMap.get(associateId) || '?').charAt(0).toUpperCase();
  }

  toggleEval(id: number): void {
    this.selectedEvalId = this.selectedEvalId === id ? null : id;
  }

  pct(e: InterviewEvaluationResponse): number {
    return e.maxScore > 0 ? Math.round((e.totalScore / e.maxScore) * 100) : 0;
  }

  rubricPct(score: number, weight: number): number {
    return weight > 0 ? Math.round((score / weight) * 100) : 0;
  }

  scoreBg(score: number, weight: number): string {
    const p = weight > 0 ? score / weight : 0;
    if (p >= 0.75) return 'rgba(52,211,153,0.15)';
    if (p >= 0.5)  return 'rgba(251,191,36,0.15)';
    return 'rgba(239,68,68,0.12)';
  }

  scoreClr(score: number, weight: number): string {
    const p = weight > 0 ? score / weight : 0;
    if (p >= 0.75) return '#34d399';
    if (p >= 0.5)  return '#fbbf24';
    return '#ef4444';
  }
}
