import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { BatchService } from '../../core/services/batch.service';
import { AssociateService } from '../../core/services/associate.service';
import { TrainerService } from '../../core/services/trainer.service';
import { AssessmentService } from '../../core/services/assessment.service';
import { ScheduleService } from '../../core/services/schedule.service';
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
  associateStats = { myBatch: '', batchStatus: '', upcomingSessions: 0, projectStatus: 'Not Submitted', quizzesTotal: 0, quizzesPassed: 0 };

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
      batches: this.batchSvc.getAll(),
      associates: this.associateSvc.getAll(),
      trainers: this.trainerSvc.getAll(),
      assessments: this.assessmentSvc.getAll()
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
    this.trainerSvc.getAll().pipe(
      switchMap(trainers => {
        const me = trainers.find(t => t.userId === userId);
        const trainerId = me ? (me.trainerId ?? me.id) : null;
        const batchObs = trainerId != null
          ? this.batchSvc.filterByTrainer(trainerId)
          : this.batchSvc.getAll();
        return forkJoin({ batches: batchObs, assessments: this.assessmentSvc.getAll() });
      })
    ).subscribe({
      next: (res) => {
        this.myBatches = res.batches.filter((b: any) => b.status === 'ACTIVE' || b.status === 'UPCOMING');
        this.trainerStats.myBatches = this.myBatches.length;
        this.trainerStats.myAssociates = this.myBatches.reduce((sum: number, b: any) => sum + (b.associates?.length ?? 0), 0);
        this.trainerStats.quizzes = res.assessments.filter((a: any) => a.type === 'QUIZ').length;
        this.trainerStats.interviews = res.assessments.filter((a: any) => a.type !== 'QUIZ').length;
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

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of({ me: null, batchId: null as number | null, batch: null, quizzes: [], schedules: [] });
        return this.associateSvc.getMyEnrollment(me.id).pipe(
          catchError(() => of(null)),
          switchMap((enrollment: any) => {
            const batchId: number | null = enrollment?.batchId ?? me.batchId ?? null;
            if (!batchId) return of({ me, batchId: null, batch: null, quizzes: [], schedules: [] });
            return forkJoin({
              batch:     this.batchSvc.getById(batchId).pipe(catchError(() => of(null))),
              quizzes:   this.assessmentSvc.getQuizzesByBatch(batchId).pipe(catchError(() => of([]))),
              schedules: this.scheduleSvc.getByBatch(batchId).pipe(catchError(() => of([])))
            }).pipe(map(extra => ({ me, batchId, ...extra })));
          })
        );
      }),
      switchMap((res: any) => {
        if (!res.me || !res.batchId) return of({ ...res, quizResults: [] });
        const published = (res.quizzes ?? []).filter((q: any) => q.status === 'PUBLISHED');
        if (!published.length) return of({ ...res, quizResults: [] });
        const resultObs: Observable<any>[] = published.map((q: any) =>
          this.assessmentSvc.getQuizResult(q.id, res.me.id).pipe(catchError(() => of(null)))
        );
        return forkJoin(resultObs).pipe(
          map((results: any[]) => ({ ...res, quizResults: results.filter(Boolean) })),
          catchError(() => of({ ...res, quizResults: [] }))
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
        this.associateStats.quizzesTotal = (res.quizResults ?? []).length;
        this.associateStats.quizzesPassed = (res.quizResults ?? []).filter((r: any) => r.resultStatus === 'PASSED').length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadStaffDashboard(): void {
    forkJoin({
      batches: this.batchSvc.getAll(),
      assessments: this.assessmentSvc.getAll()
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
