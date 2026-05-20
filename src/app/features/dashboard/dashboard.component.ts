import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { BatchService } from '../../core/services/batch.service';
import { AssociateService } from '../../core/services/associate.service';
import { TrainerService } from '../../core/services/trainer.service';
import { AssessmentService } from '../../core/services/assessment.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  loading = true;
  username = this.auth.getUsername();
  role = this.auth.getRole() ?? '';

  isAdmin = this.auth.isAdmin();
  isTrainer = this.auth.isTrainer();
  isAssociate = this.auth.isAssociate();
  isCoach = this.auth.isCoach();
  isTechLead = this.auth.isTechLead();
  isScrumLead = this.auth.isScrumLead();
  isStaff = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_COACH', 'ROLE_TECH_LEAD', 'ROLE_SCRUM_LEAD');

  // Admin / Tech Lead stats
  stats = { batches: 0, associates: 0, trainers: 0, assessments: 0, ongoing: 0, upcoming: 0, completed: 0 };

  // Trainer stats
  trainerStats = { myBatches: 0, myAssociates: 0, quizzes: 0, interviews: 0 };

  // Associate stats
  associateStats = { myBatch: '', batchStatus: '', upcomingSessions: 0, projectsSubmitted: 0, quizzesTotal: 0, quizzesPassed: 0 };

  recentBatches: any[] = [];
  ongoingBatches: any[] = [];
  myBatches: any[] = [];       // trainer's batches
  upcomingSchedules: any[] = [];

  constructor(
    private batchSvc: BatchService,
    private associateSvc: AssociateService,
    private trainerSvc: TrainerService,
    private assessmentSvc: AssessmentService,
    private scheduleSvc: ScheduleService,
    private projectSvc: ProjectService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isAdmin || this.isTechLead) {
      this.loadAdminDashboard();
    } else if (this.isTrainer) {
      this.loadTrainerDashboard();
    } else if (this.isAssociate) {
      this.loadAssociateDashboard();
    } else {
      this.loadStaffDashboard();
    }
  }

  private loadAdminDashboard(): void {
    forkJoin({
      batches: this.batchSvc.getAll().pipe(catchError(() => of([]))),
      associates: this.associateSvc.getAll().pipe(catchError(() => of([]))),
      trainers: this.trainerSvc.getAll().pipe(catchError(() => of([]))),
      assessments: this.assessmentSvc.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.stats.batches = res.batches.length;
        this.stats.associates = res.associates.length;
        this.stats.trainers = res.trainers.length;
        this.stats.assessments = res.assessments.length;
        this.stats.ongoing = res.batches.filter((b: any) => b.status === 'ACTIVE').length;
        this.stats.upcoming = res.batches.filter((b: any) => b.status === 'UPCOMING').length;
        this.stats.completed = res.batches.filter((b: any) => b.status === 'COMPLETED').length;
        this.recentBatches = res.batches.slice(0, 5);
        this.ongoingBatches = res.batches.filter((b: any) => b.status === 'ACTIVE').slice(0, 4);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadTrainerDashboard(): void {
    const userId = this.auth.getUserId();
    forkJoin({
      trainers:    this.trainerSvc.getAll().pipe(catchError(() => of([]))),
      batches:     this.batchSvc.getAll().pipe(catchError(() => of([]))),
      assessments: this.assessmentSvc.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ trainers, batches, assessments }) => {
        const me = (trainers as any[]).find(t => Number(t.userId) === Number(userId));
        const myIds = new Set<number>(
          [me?.trainerId, me?.id, me?.userId].filter((v): v is number => v != null)
        );
        const trainerBatches = myIds.size > 0
          ? (batches as any[]).filter(b => myIds.has(Number(b.trainerId)))
          : [];
        this.myBatches = trainerBatches.filter((b: any) => b.status === 'ACTIVE' || b.status === 'UPCOMING');
        this.trainerStats.myBatches = this.myBatches.length;
        this.trainerStats.myAssociates = this.myBatches.reduce((sum: number, b: any) => sum + (b.associates?.length ?? 0), 0);
        this.trainerStats.quizzes = (assessments as any[]).filter((a: any) => a.type === 'QUIZ').length;
        this.trainerStats.interviews = (assessments as any[]).filter((a: any) => a.type !== 'QUIZ').length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private bestEnrollment(enrollments: any[]): any {
    const PRIORITY: Record<string, number> = { ACTIVE: 0, ENROLLED: 1, COMPLETED: 2 };
    return [...enrollments].sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9))[0] ?? null;
  }

  private loadAssociateDashboard(): void {
    const userId = this.auth.getUserId();

    // GET /associates/{userId} queries by userId column — direct lookup is correct
    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of({ me: null, batchId: null as number | null, batch: null, quizzes: [], schedules: [], projects: [] });

        // Use batchId directly if valid, otherwise fall back to enrollment lookup
        const directBatchId: number | null = (me.batchId && me.batchId > 0) ? me.batchId : null;

        const batchId$ = directBatchId
          ? of(directBatchId)
          : this.associateSvc.getMyEnrollment(me.id).pipe(
              catchError(() => of(null)),
              map((enrollment: any) => {
                const arr = Array.isArray(enrollment) ? (enrollment[0] ?? null) : enrollment;
                const bid: number | null = arr?.batchId ?? arr?.batch?.id ?? null;
                return (bid && bid > 0) ? bid : null;
              })
            );

        return batchId$.pipe(
          switchMap((batchId: number | null) => {
            if (!batchId) return of({ me, batchId: null, batch: null, quizzes: [], schedules: [], projects: [] });
            return forkJoin({
              batch:     this.batchSvc.getById(batchId).pipe(catchError(() => of(null))),
              quizzes:   this.assessmentSvc.getQuizzesByBatch(batchId).pipe(catchError(() => of([]))),
              schedules: this.scheduleSvc.getByBatch(batchId).pipe(catchError(() => of([]))),
              projects:  this.projectSvc.getProjects().pipe(catchError(() => of([])))
            }).pipe(map(extra => ({ me, batchId, ...extra })));
          })
        );
      }),
      switchMap((res: any) => {
        if (!res.me || !res.batchId) return of({ ...res, quizResults: [] });
        const published = (res.quizzes ?? []).filter((q: any) => q.status === 'PUBLISHED');
        if (!published.length) return of({ ...res, quizResults: [], quizzesTotal: 0 });
        const resultObs: Observable<any>[] = published.map((q: any) =>
          this.assessmentSvc.getQuizResult(q.id, userId).pipe(catchError(() => of(null)))
        );
        return forkJoin(resultObs).pipe(
          map((results: any[]) => ({ ...res, quizResults: results.filter(Boolean), quizzesTotal: published.length })),
          catchError(() => of({ ...res, quizResults: [], quizzesTotal: published.length }))
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (res.batchId) {
          this.associateStats.myBatch = res.batch
            ? (res.batch.courseNames?.join(', ') || ('Batch #' + res.batch.id))
            : ('Batch #' + res.batchId);
          this.associateStats.batchStatus = res.batch?.status ?? '';
        }
        const today = new Date();
        this.upcomingSchedules = (res.schedules ?? [])
          .filter((s: any) => new Date(s.sessionDate) >= today)
          .sort((a: any, b: any) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
          .slice(0, 3);
        this.associateStats.upcomingSessions = this.upcomingSchedules.length;
        this.associateStats.quizzesTotal = res.quizzesTotal ?? 0;
        this.associateStats.quizzesPassed = (res.quizResults ?? []).filter((r: any) => r.resultStatus === 'PASS').length;
        this.associateStats.projectsSubmitted = (res.projects ?? []).filter((p: any) => p.batchId === res.batchId).length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadStaffDashboard(): void {
    forkJoin({
      batches: this.batchSvc.getAll().pipe(catchError(() => of([]))),
      assessments: this.assessmentSvc.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.stats.batches = res.batches.length;
        this.stats.ongoing = res.batches.filter((b: any) => b.status === 'ACTIVE').length;
        this.stats.upcoming = res.batches.filter((b: any) => b.status === 'UPCOMING').length;
        this.stats.assessments = res.assessments.length;
        this.recentBatches = res.batches.slice(0, 5);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'status-ongoing', UPCOMING: 'status-upcoming', COMPLETED: 'status-completed' };
    return map[status] ?? '';
  }

  getRoleGreeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }

  getRoleLabel(): string {
    const map: Record<string, string> = {
      ROLE_ADMIN: 'Administrator', ROLE_TRAINER: 'Trainer',
      ROLE_ASSOCIATE: 'Associate', ROLE_COACH: 'Coach',
      ROLE_TECH_LEAD: 'Tech Lead', ROLE_SCRUM_LEAD: 'Scrum Lead'
    };
    return map[this.role] ?? this.role;
  }
}
