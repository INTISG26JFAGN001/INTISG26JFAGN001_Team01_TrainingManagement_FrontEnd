import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-batch',
  templateUrl: './my-batch.component.html',
  styleUrls: ['./my-batch.component.scss']
})
export class MyBatchComponent implements OnInit {
  loading = true;

  batch: any = null;
  batchId: number | null = null;
  associateId = 0;
  associateUserId = 0;

  batchStartDate: string | null = null;
  batchEndDate: string | null = null;

  // stats
  upcomingSessions = 0;
  pastSessions = 0;
  totalQuizzes = 0;
  totalInterviews = 0;
  myProjects = 0;
  batchmates = 0;

  // progress bar
  progressPct = 0;
  daysLeft = 0;
  totalDays = 0;

  constructor(
    private associateSvc: AssociateService,
    private batchSvc: BatchService,
    private scheduleSvc: ScheduleService,
    private assessmentSvc: AssessmentService,
    private projectSvc: ProjectService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of(null);
        this.associateId     = me.id     ?? 0;
        this.associateUserId = me.userId ?? 0;

        const directBatchId: number | null = (me.batchId && me.batchId > 0) ? Number(me.batchId) : null;

        if (directBatchId) {
          return this.loadBatchData(directBatchId);
        }

        return this.findBatchIdFromEnrollment([me.id, userId, me.userId]).pipe(
          switchMap((batchId: number | null) => {
            if (!batchId) return of(null);
            return this.loadBatchData(batchId);
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (!res) { this.loading = false; return; }

        this.batchId = res.batchId;
        this.batch   = res.batch;

        // Extract dates — try camelCase, snake_case, and array formats
        const b = res.batch;
        this.batchStartDate = this.extractDate(b?.startDate ?? b?.start_date);
        this.batchEndDate   = this.extractDate(b?.endDate   ?? b?.end_date);

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const schedules: any[] = Array.isArray(res.schedules) ? res.schedules : [];
        this.upcomingSessions = schedules.filter((s: any) => new Date(s.sessionDate) >= todayStart).length;
        this.pastSessions     = schedules.filter((s: any) => new Date(s.sessionDate) < todayStart).length;

        this.totalQuizzes    = (res.quizzes    as any[]).filter((q: any) => q.status === 'PUBLISHED' || q.status === 'CLOSED').length;
        this.totalInterviews = (res.interviews as any[]).filter((i: any) => i.status === 'PUBLISHED' || i.status === 'CLOSED').length;
        this.myProjects      = (res.projects   as any[]).filter((p: any) => p.batchId === res.batchId).length;
        this.batchmates      = Array.isArray(res.batchmates) ? (res.batchmates as any[]).length : 0;

        if (this.batchStartDate && this.batchEndDate) {
          const start = new Date(this.batchStartDate).getTime();
          const end   = new Date(this.batchEndDate).getTime();
          const now   = Date.now();
          this.totalDays   = Math.max(1, Math.round((end - start) / 86400000));
          this.daysLeft    = Math.max(0, Math.round((end - now)   / 86400000));
          this.progressPct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
        }

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadBatchData(batchId: number): Observable<any> {
    // Fetch basic and detail in parallel — merge so we get the most complete object possible.
    // Associates may not have access to /details, so we never rely on it alone.
    const batch$ = forkJoin([
      this.batchSvc.getById(batchId).pipe(catchError(() => of(null))),
      this.batchSvc.getDetails(batchId).pipe(catchError(() => of(null))),
    ]).pipe(
      map(([basic, details]: [any, any]) => {
        const merged = { ...(basic ?? {}), ...(details ?? {}) };
        return Object.keys(merged).length ? merged : null;
      }),
      catchError(() => of(null))
    );

    return forkJoin({
      batch:       batch$,
      schedules:   this.scheduleSvc.getByBatch(batchId).pipe(catchError(() => of([]))),
      quizzes:     this.assessmentSvc.getQuizzesByBatch(batchId).pipe(catchError(() => of([]))),
      interviews:  this.assessmentSvc.getInterviewsByBatch(batchId).pipe(catchError(() => of([]))),
      projects:    this.projectSvc.getProjects().pipe(catchError(() => of([]))),
      batchmates:  this.associateSvc.getByBatch(batchId).pipe(catchError(() => of([])))
    }).pipe(switchMap((res: any) => of({ ...res, batchId })));
  }

  private findBatchIdFromEnrollment(ids: (number | undefined)[]): Observable<number | null> {
    const valid = ids.filter((v): v is number => v != null && !isNaN(v));
    if (!valid.length) return of(null);
    const [head, ...tail] = valid;
    return this.associateSvc.getMyEnrollment(head).pipe(
      catchError(() => of(null)),
      switchMap((raw: any): Observable<number | null> => {
        const e = Array.isArray(raw) ? (raw[0] ?? null) : raw;
        const bid = e?.batchId ? Number(e.batchId) : null;
        if (bid && bid > 0) return of(bid);
        return tail.length ? this.findBatchIdFromEnrollment(tail) : of(null);
      })
    );
  }

  /**
   * Normalises a raw API date value to an ISO string Angular's date pipe can consume.
   * Handles: ISO string ("2024-01-15"), Java LocalDate array ([2024, 1, 15]),
   * and timestamp number.
   */
  extractDate(val: any): string | null {
    if (!val) return null;
    // Java LocalDate serialised as [year, month, day]
    if (Array.isArray(val) && val.length >= 3) {
      const [y, m, d] = val;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    // Already a string or number — validate it
    const dt = new Date(val);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }

  formatDate(val: string | null): string {
    if (!val) return '—';
    const dt = new Date(val);
    return isNaN(dt.getTime()) ? val : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getBatchStatusClass(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'chip-active', UPCOMING: 'chip-upcoming', COMPLETED: 'chip-completed' };
    return map[status] ?? '';
  }
}
