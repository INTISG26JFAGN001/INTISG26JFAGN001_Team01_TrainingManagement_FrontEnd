import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AssessmentService, InterviewEvaluationResponse } from '../../../core/services/assessment.service';
import { AssociateService } from '../../../core/services/associate.service';
import { UserService } from '../../../core/services/user.service';
import { Associate, User } from '../../../core/models';

@Component({
  selector: 'app-interview-results-dialog',
  templateUrl: './interview-results-dialog.component.html',
  styleUrls: ['./interview-results-dialog.component.scss']
})
export class InterviewResultsDialogComponent implements OnInit {
  results: InterviewEvaluationResponse[] = [];
  loading = true;
  private nameMap = new Map<number, string>();

  get passCount(): number { return this.results.filter(r => r.resultStatus === 'PASS').length; }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { interviewId: number; title: string },
    private svc: AssessmentService,
    private associateSvc: AssociateService,
    private userSvc: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Step 1: load evaluations
    this.svc.getEvaluationsByAssessment(this.data.interviewId).subscribe({
      next: results => {
        this.results = results;
        this.loading = false;
        if (results.length > 0) {
          this.loadNames(results.map(r => r.associateId));
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

      const userRequests = pairs.map(p =>
        this.userSvc.getById(p.userId).pipe(catchError(() => of(null as User | null)))
      );
      forkJoin(userRequests).pipe(catchError(() => of([]))).subscribe((users: any[]) => {
        pairs.forEach((p, i) => {
          const u = users[i] as User | null;
          if (u) this.nameMap.set(p.assocId, u.fullName || u.username || ('Associate #' + p.assocId));
        });
        this.cdr.detectChanges();
      });
    });
  }

  getName(associateId: number): string {
    return this.nameMap.get(associateId) || ('Associate #' + associateId);
  }

  getInitial(associateId: number): string {
    return (this.nameMap.get(associateId) || '#').charAt(0).toUpperCase();
  }

  pct(r: InterviewEvaluationResponse): number {
    return r.maxScore > 0 ? Math.round((r.totalScore / r.maxScore) * 100) : 0;
  }

  rubricPct(scoreAwarded: number, weight: number): number {
    return weight > 0 ? Math.round((scoreAwarded / weight) * 100) : 0;
  }

  scoreBg(scoreAwarded: number, weight: number): string {
    const p = weight > 0 ? scoreAwarded / weight : 0;
    if (p >= 0.75) return 'rgba(52,211,153,0.15)';
    if (p >= 0.5)  return 'rgba(251,191,36,0.15)';
    return 'rgba(239,68,68,0.12)';
  }

  scoreColor(scoreAwarded: number, weight: number): string {
    const p = weight > 0 ? scoreAwarded / weight : 0;
    if (p >= 0.75) return '#34d399';
    if (p >= 0.5)  return '#fbbf24';
    return '#ef4444';
  }
}
