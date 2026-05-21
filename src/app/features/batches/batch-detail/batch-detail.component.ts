import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { BatchService } from '../../../core/services/batch.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { UserService } from '../../../core/services/user.service';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchDetails, BatchStatus, User, Trainer, Associate, Enrollment } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-batch-detail', templateUrl: './batch-detail.component.html', styleUrls: ['./batch-detail.component.scss'] })
export class BatchDetailComponent implements OnInit {
  batch!: BatchDetails;
  trainerName = '';
  trainerUserId: number | null = null;
  loading = true;
  isAdmin = this.auth.isAdmin();
  statuses: BatchStatus[] = ['UPCOMING', 'ACTIVE', 'COMPLETED'];

  constructor(
    private route: ActivatedRoute,
    private svc: BatchService,
    private trainerSvc: TrainerService,
    private userSvc: UserService,
    private associateSvc: AssociateService,
    private auth: AuthService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    // Step 1: load batch + enrollments + associates + trainers
    forkJoin({
      batch:         this.svc.getDetails(id),
      enrollments:   this.associateSvc.getEnrollmentsByBatch(id).pipe(catchError(() => of([] as Enrollment[]))),
      allAssociates: this.associateSvc.getAll().pipe(catchError(() => of([] as Associate[]))),
      trainers:      this.trainerSvc.getAll().pipe(catchError(() => of([] as Trainer[])))
    }).pipe(
      // Step 2: collect the exact userIds we need, then fetch only those users individually
      // GET /user/{id} is accessible to all roles; GET /user/all is admin-only
      switchMap(({ batch, enrollments, allAssociates, trainers }) => {
        const associateMap = new Map<number, Associate>(allAssociates.map(a => [a.id, a]));
        const trainer = trainers.find(t => (t.trainerId ?? t.id) === batch.trainerId);

        const userIds = new Set<number>();
        enrollments.forEach((e: Enrollment) => {
          const assoc = associateMap.get(e.associateId);
          if (assoc?.userId) userIds.add(assoc.userId);
        });
        if (trainer?.userId) userIds.add(trainer.userId);

        const userFetches = [...userIds].map(uid =>
          this.userSvc.getById(uid).pipe(catchError(() => of(null)))
        );

        const users$ = userFetches.length
          ? forkJoin(userFetches).pipe(map(results => results.filter(Boolean) as User[]))
          : of([] as User[]);

        return users$.pipe(
          map(users => ({ batch, enrollments, allAssociates, trainers, users }))
        );
      })
    ).subscribe({
      next: ({ batch, enrollments, allAssociates, trainers, users }) => {
        const userMap      = new Map<number, User>(users.map(u => [u.id, u]));
        const associateMap = new Map<number, Associate>(allAssociates.map(a => [a.id, a]));

        const enrichedAssociates: Associate[] = enrollments.map((e: Enrollment) => {
          const assoc = associateMap.get(e.associateId);
          if (!assoc) return { id: e.associateId, userId: e.associateId } as Associate;
          const u = userMap.get(assoc.userId);
          return u ? { ...assoc, fullName: u.fullName || u.username, email: u.email } : assoc;
        });

        (batch as any).associates = enrichedAssociates;
        this.batch = batch as BatchDetails;

        const trainer = trainers.find(t => (t.trainerId ?? t.id) === batch.trainerId);
        if (trainer) {
          this.trainerUserId = trainer.userId;
          const trainerUser  = userMap.get(trainer.userId);
          this.trainerName   = trainerUser
            ? (trainerUser.fullName || trainerUser.username)
            : (trainer.fullName || '');
        }

        this.loading = false;
      },
      error: () => {
        this.snack.open('Failed to load batch details', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  updateStatus(status: BatchStatus): void {
    this.svc.updateStatus(this.batch.id, status).subscribe({
      next: (b) => { this.batch.status = b.status; this.snack.open('Status updated', 'Close', { duration: 3000 }); },
      error: () => this.snack.open('Failed to update status', 'Close', { duration: 3000 })
    });
  }

  getStatusClass(s: string): string {
    return { ACTIVE: 'status-ongoing', UPCOMING: 'status-upcoming', COMPLETED: 'status-completed' }[s] ?? '';
  }

  formatDate(val: string | undefined): string {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getXpLabel(xp: number | undefined, experienceLevel: string | undefined): string {
    if (experienceLevel) return experienceLevel;
    const map: Record<number, string> = { 0: 'Junior', 1: 'Mid', 2: 'Senior' };
    return xp !== undefined ? (map[xp] ?? String(xp)) : '—';
  }
}
