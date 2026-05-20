import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
    forkJoin({
      batch: this.svc.getDetails(id),
      // Use enrollment endpoint — source of truth for who is actually enrolled in this batch
      enrollments: this.associateSvc.getEnrollmentsByBatch(id).pipe(catchError(() => of([] as Enrollment[]))),
      // Load all associates so we can resolve associateId → userId for each enrollment
      allAssociates: this.associateSvc.getAll().pipe(catchError(() => of([] as Associate[]))),
      trainers: this.trainerSvc.getAll().pipe(catchError(() => of([] as Trainer[]))),
      users: this.userSvc.getAll().pipe(catchError(() => of([] as User[])))
    }).subscribe({
      next: ({ batch, enrollments, allAssociates, trainers, users }) => {
        // Build lookup maps
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));
        // associateMap keyed by Associate PK (id), matching Enrollment.associateId
        const associateMap = new Map<number, Associate>(allAssociates.map(a => [a.id, a]));

        // Build enrolled students: enrollment → associate (by PK) → user (by userId)
        const enrichedAssociates: Associate[] = enrollments.map((e: Enrollment) => {
          const assoc = associateMap.get(e.associateId);
          if (!assoc) return { id: e.associateId, userId: e.associateId } as Associate;
          const u = userMap.get(assoc.userId);
          return u ? { ...assoc, fullName: u.fullName || u.username, email: u.email } : assoc;
        });

        // Attach enriched associates — backend doesn't include them in BatchDetailsDTO
        (batch as any).associates = enrichedAssociates;
        this.batch = batch as BatchDetails;

        // Resolve trainer name
        const trainer = trainers.find(t => (t.trainerId ?? t.id) === batch.trainerId);
        if (trainer) {
          this.trainerUserId = trainer.userId;
          const trainerUser = userMap.get(trainer.userId);
          this.trainerName = trainerUser
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
