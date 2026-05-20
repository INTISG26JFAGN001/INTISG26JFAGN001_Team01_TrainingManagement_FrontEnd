import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { UserService } from '../../../core/services/user.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { Associate, Batch, Enrollment, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { AssociateFormComponent } from '../associate-form/associate-form.component';
import { AssociateEditFormComponent } from '../associate-edit-form/associate-edit-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({ selector: 'app-associate-list', templateUrl: './associate-list.component.html', styleUrls: ['./associate-list.component.scss'] })
export class AssociateListComponent implements OnInit {
  dataSource = new MatTableDataSource<Associate>();
  batches: Batch[] = [];
  loading = true;
  isAdmin = this.auth.isAdmin();
  isAssociate = this.auth.isAssociate();
  myProfile: Associate | null = null;

  expandedAssociate: Associate | null = null;
  private scheduleCache = new Map<number, any[]>();
  scheduleLoading = new Set<number>();

  get displayedColumns(): string[] {
    if (this.isAssociate) return ['fullName', 'experienceLevel', 'batch'];
    if (this.isAdmin) return ['userId', 'fullName', 'email', 'experienceLevel', 'batch', 'schedules', 'actions'];
    return ['userId', 'fullName', 'email', 'experienceLevel', 'batch', 'schedules'];
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private svc: AssociateService,
    private batchSvc: BatchService,
    private userSvc: UserService,
    private scheduleSvc: ScheduleService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) { }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    if (this.isAssociate) {
      this.loadMyProfile();
      return;
    }
    forkJoin({
      associates:  this.svc.getAll(),
      batches:     this.batchSvc.getAll(),
      users:       this.userSvc.getAll().pipe(catchError(() => of([] as User[]))),
      enrollments: this.svc.getAllEnrollments().pipe(catchError(() => of([] as Enrollment[])))
    }).subscribe({
      next: ({ associates, batches, users, enrollments }) => {
        this.batches = batches;
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));
        const STATUS_PRIORITY: Record<string, number> = { ACTIVE: 0, ENROLLED: 1, COMPLETED: 2 };
        const grouped = new Map<number, Enrollment[]>();
        for (const e of enrollments) {
          if (!grouped.has(e.associateId)) grouped.set(e.associateId, []);
          grouped.get(e.associateId)!.push(e);
        }
        const enrollmentBatchMap = new Map<number, number>();
        grouped.forEach((list, associateId) => {
          list.sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
          enrollmentBatchMap.set(associateId, list[0].batchId);
        });
        const enriched: Associate[] = associates.map((a: Associate) => {
          const u = userMap.get(a.userId);
          const enrolledBatchId = enrollmentBatchMap.get(a.id) ?? 0;
          return { ...a, ...(u ? { fullName: u.fullName || u.username, email: u.email } : {}), batchId: enrolledBatchId };
        });
        this.dataSource.data = enriched;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => { this.snack.open('Failed to load associates', 'Close', { duration: 3000 }); this.loading = false; }
    });
  }

  private loadMyProfile(): void {
    const userId = this.auth.getUserId();
    this.svc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((associate: any) => {
        if (!associate) return of({ associate: null, user: null, enrollment: null, batch: null });
        return forkJoin({
          user:       this.userSvc.getById(userId).pipe(catchError(() => of(null))),
          enrollment: this.svc.getMyEnrollment(associate.id).pipe(catchError(() => of(null)))
        }).pipe(
          switchMap(({ user, enrollment }: any) => {
            const batchId: number | null = enrollment?.batchId ?? associate.batchId ?? null;
            if (!batchId) return of({ associate, user, enrollment, batch: null });
            return this.batchSvc.getById(batchId).pipe(
              catchError(() => of(null)),
              map((batch: any) => ({ associate, user, enrollment, batch }))
            );
          })
        );
      })
    ).subscribe({
      next: ({ associate, user, enrollment, batch }: any) => {
        if (!associate) { this.loading = false; return; }
        const batchId = enrollment?.batchId ?? associate.batchId ?? 0;
        this.myProfile = {
          ...associate,
          fullName: user?.fullName || user?.username || '',
          email: user?.email || '',
          batchId
        };
        if (batch) this.batches = [batch];
        this.dataSource.data = [this.myProfile!];
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => { this.snack.open('Failed to load profile', 'Close', { duration: 3000 }); this.loading = false; }
    });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openAddForm(): void {
    this.dialog.open(AssociateFormComponent, { width: '480px' }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openEdit(a: Associate): void {
    this.dialog.open(AssociateEditFormComponent, { width: '420px', data: a }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(a: Associate): void {
    const displayName = a.fullName || ('User #' + a.userId);
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove Associate',
        message: `Remove "${displayName}" as an associate?\n\nNote: This only removes the associate profile. Their user account will remain active.`,
        danger: true,
        confirmText: 'Remove'
      }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.svc.delete(a.id).subscribe({
          next: () => {
            this.snack.open('Associate profile removed. User account is still active.', 'Close', { duration: 4000 });
            this.load();
          },
          error: (e) => this.snack.open(e.error?.message || e.error || 'Failed to remove associate', 'Close', { duration: 3000 })
        });
      }
    });
  }

  toggleExpand(a: Associate, event: Event): void {
    event.stopPropagation();
    const isExpanding = this.expandedAssociate !== a;
    this.expandedAssociate = isExpanding ? a : null;
    if (!isExpanding) return;

    const batchId = a.batchId ?? 0;
    if (!batchId || this.scheduleCache.has(batchId) || this.scheduleLoading.has(batchId)) return;

    this.scheduleLoading.add(batchId);
    this.scheduleSvc.getByBatch(batchId).pipe(catchError(() => of([]))).subscribe((schedules: any[]) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const upcoming = schedules
        .filter((s: any) => new Date(s.sessionDate) >= today)
        .sort((a: any, b: any) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
      this.scheduleCache.set(batchId, upcoming);
      this.scheduleLoading.delete(batchId);
    });
  }

  getSchedules(a: Associate): any[] {
    return this.scheduleCache.get(a.batchId ?? 0) ?? [];
  }

  isLoadingSchedules(a: Associate): boolean {
    return this.scheduleLoading.has(a.batchId ?? 0);
  }

  getDisplayName(a: Associate): string { return a.fullName || ('User #' + a.userId); }

  getXpLabel(a: Associate): string {
    if (a.experienceLevel) return a.experienceLevel;
    const map: Record<number, string> = { 0: 'JUNIOR', 1: 'MID', 2: 'SENIOR' };
    return a.xp !== undefined ? (map[a.xp] ?? String(a.xp)) : '—';
  }

  getXpClass(xp: string): string {
    const map: Record<string, string> = { JUNIOR: 'badge-junior', MID: 'badge-mid', SENIOR: 'badge-senior' };
    return map[xp?.toUpperCase()] ?? 'badge-junior';
  }

  getBatchLabel(a: Associate): string {
    const id = a.batchId ?? a.currentBatchId ?? 0;
    if (!id || id === 0) return '—';
    return `#${id}`;
  }

  isToday(dateStr: string): boolean {
    const d = new Date(dateStr), t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  isBatchAssigned(a: Associate): boolean {
    const id = a.batchId ?? a.currentBatchId ?? 0;
    return !!id && id !== 0;
  }
}
