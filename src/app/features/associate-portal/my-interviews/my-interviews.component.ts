import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AuthService } from '../../../core/services/auth.service';

interface InterviewRow {
  id: number;
  title: string;
  category: string;
  dueDate: string | null;
  status: string;
  evaluated: boolean;
  totalScore: number | null;
  maxScore: number | null;
  scorePercent: number | null;
  resultStatus: string | null;
}

type TabKey = 'upcoming' | 'completed' | 'missed';

@Component({
  selector: 'app-my-interviews',
  templateUrl: './my-interviews.component.html',
  styleUrls: ['./my-interviews.component.scss']
})
export class MyInterviewsComponent implements OnInit {
  loading = true;
  batchId: number | null = null;
  associateId = 0;
  interviews: InterviewRow[] = [];
  activeTab: TabKey = 'upcoming';

  get upcoming(): InterviewRow[] {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.interviews.filter(i =>
      !i.evaluated && i.status !== 'CLOSED' &&
      (!i.dueDate || new Date(i.dueDate) >= today)
    );
  }

  get completed(): InterviewRow[] {
    return this.interviews.filter(i => i.evaluated);
  }

  get missed(): InterviewRow[] {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.interviews.filter(i =>
      !i.evaluated &&
      (i.status === 'CLOSED' || (i.dueDate && new Date(i.dueDate) < today))
    );
  }

  get filteredInterviews(): InterviewRow[] {
    if (this.activeTab === 'completed') return this.completed;
    if (this.activeTab === 'missed') return this.missed;
    return this.upcoming;
  }

  selectTab(tab: TabKey): void { this.activeTab = tab; }

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
            if (!batchId) return of(null);
            this.batchId = batchId;
            return forkJoin({
              interviews: this.assessmentSvc.getInterviewsByBatch(batchId).pipe(catchError(() => of([]))),
              myEvals:    this.assessmentSvc.getInterviewEvaluationsByAssociate(me.id).pipe(catchError(() => of([])))
            });
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (!res) { this.loading = false; return; }

        const { interviews, myEvals } = res;
        const evalMap = new Map<number, any>();
        for (const e of (myEvals as any[])) {
          // key by assessmentId
          const key = e.assessmentId ?? e.interviewId;
          if (key) evalMap.set(key, e);
        }

        const published = (interviews as any[]).filter(
          (i: any) => i.status === 'PUBLISHED' || i.status === 'CLOSED'
        );

        this.interviews = published.map((i: any): InterviewRow => {
          const ev = evalMap.get(i.id) ?? null;
          const maxScore = i.maxScore ?? null;
          const totalScore = ev?.totalScore ?? null;
          const scorePercent = (maxScore && totalScore !== null)
            ? Math.round((totalScore / maxScore) * 100) : null;

          return {
            id: i.id,
            title: i.title,
            category: i.interviewCategory ?? i.category ?? 'GENERAL',
            dueDate: i.dueDate ?? i.scheduledDateTime ?? null,
            status: i.status,
            evaluated: !!ev,
            totalScore,
            maxScore,
            scorePercent,
            resultStatus: ev?.resultStatus ?? null
          };
        });

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = { INTERIM: 'Interim', FINAL: 'Final', GENERAL: 'General' };
    return map[cat] ?? cat;
  }

  getCategoryClass(cat: string): string {
    const map: Record<string, string> = { INTERIM: 'cat-interim', FINAL: 'cat-final', GENERAL: 'cat-general' };
    return map[cat] ?? 'cat-general';
  }

  getScoreBarColor(pct: number): string {
    if (pct >= 70) return '#34d399';
    if (pct >= 50) return '#fbbf24';
    return '#ef4444';
  }

  getResultClass(status: string): string {
    const map: Record<string, string> = { PASS: 'chip-pass', FAIL: 'chip-fail' };
    return map[status] ?? '';
  }
}
