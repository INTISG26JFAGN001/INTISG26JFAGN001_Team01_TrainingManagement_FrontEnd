import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { UserService } from '../../../core/services/user.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss']
})
export class MyProfileComponent implements OnInit {
  loading = true;

  associate: any = null;
  batch: any = null;

  // Stats
  quizzesAttempted = 0;
  quizzesPassed = 0;
  projectsCount = 0;

  constructor(
    private associateSvc: AssociateService,
    private batchSvc: BatchService,
    private userSvc: UserService,
    private assessmentSvc: AssessmentService,
    private projectSvc: ProjectService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId   = this.auth.getUserId();
    const username = this.auth.getUsername();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of({ associate: null, batch: null, quizResults: [], projects: [], batchId: null });

        // Use /user/username (accessible for associates — same endpoint as login)
        // rather than /user/{id} which may be admin-only
        return this.userSvc.searchByUsername(username).pipe(
          catchError(() => of(null)),
          map((res: any) => Array.isArray(res) ? (res[0] ?? null) : res),
          switchMap((user: any) => {
            const associate = {
              ...me,
              fullName: me.fullName || user?.fullName || username,
              email:    me.email    || user?.email    || '',
              username: user?.username || username,
              role:     this.auth.getRole() ?? ''
            };

            const batchId: number | null = (me.batchId && me.batchId > 0) ? Number(me.batchId) : null;
            if (!batchId) return of({ associate, batch: null, quizResults: [], projects: [], batchId: null });

            return forkJoin({
              batch: this.batchSvc.getDetails(batchId).pipe(
                catchError(() => this.batchSvc.getById(batchId).pipe(catchError(() => of(null))))
              ),
              quizzes: this.assessmentSvc.getQuizzesByBatch(batchId).pipe(catchError(() => of([]))),
              projects: this.projectSvc.getProjects().pipe(catchError(() => of([])))
            }).pipe(
              switchMap(({ batch, quizzes, projects }: any) => {
                const published = (quizzes as any[]).filter(
                  (q: any) => q.status === 'PUBLISHED' || q.status === 'CLOSED'
                );
                if (!published.length) {
                  return of({ associate, batch, quizResults: [], projects, batchId });
                }
                const resultObs = published.map((q: any) =>
                  this.assessmentSvc.getQuizResult(q.id, userId).pipe(catchError(() => of(null)))
                );
                return forkJoin(resultObs).pipe(
                  map(quizResults => ({ associate, batch, quizResults, projects, batchId })),
                  catchError(() => of({ associate, batch, quizResults: [], projects, batchId }))
                );
              })
            );
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        this.associate = res.associate;
        this.batch     = res.batch;

        const results: any[] = res.quizResults ?? [];
        this.quizzesAttempted = results.filter(Boolean).length;
        this.quizzesPassed    = results.filter((r: any) => r?.resultStatus === 'PASS').length;

        const batchId = res.batchId ?? null;
        this.projectsCount = (res.projects ?? []).filter((p: any) => p.batchId === batchId).length;

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get quizPassRate(): number {
    return this.quizzesAttempted > 0
      ? Math.round((this.quizzesPassed / this.quizzesAttempted) * 100)
      : 0;
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      ROLE_ASSOCIATE: 'Associate', ROLE_ADMIN: 'Administrator',
      ROLE_TRAINER: 'Trainer', ROLE_COACH: 'Coach',
      ROLE_TECH_LEAD: 'Tech Lead', ROLE_SCRUM_LEAD: 'Scrum Lead'
    };
    return map[role] ?? role;
  }

  getExperienceLabel(level: string): string {
    const map: Record<string, string> = {
      FRESHER: 'Fresher', JUNIOR: 'Junior', MID: 'Mid-level', SENIOR: 'Senior'
    };
    return map[level] ?? level ?? '';
  }

  getBatchStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-active', UPCOMING: 'chip-upcoming', COMPLETED: 'chip-completed'
    };
    return map[status] ?? '';
  }
}
