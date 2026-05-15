import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { UserService } from '../../../core/services/user.service';
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

  get displayedColumns(): string[] {
    if (this.isAssociate) return ['fullName', 'experienceLevel', 'batch'];
    if (this.isAdmin) return ['userId', 'fullName', 'email', 'experienceLevel', 'batch', 'actions'];
    return ['userId', 'fullName', 'email', 'experienceLevel', 'batch'];
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private svc: AssociateService,
    private batchSvc: BatchService,
    private userSvc: UserService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) { }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    forkJoin({
      associates:  this.svc.getAll(),
      batches:     this.batchSvc.getAll(),
      users:       this.userSvc.getAll().pipe(catchError(() => of([] as User[]))),
      enrollments: this.svc.getAllEnrollments().pipe(catchError(() => of([] as Enrollment[])))
    }).subscribe({
      next: ({ associates, batches, users, enrollments }) => {
        this.batches = batches;

        // userId → User lookup
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));

        // Build associateId (PK) → batchId map from live enrollment records.
        // Priority: ACTIVE > ENROLLED > COMPLETED so the "current" batch
        // reflects the most meaningful enrollment and updates whenever one is
        // added or removed via the Enrollments tab.
        const STATUS_PRIORITY: Record<string, number> = { ACTIVE: 0, ENROLLED: 1, COMPLETED: 2 };
        const grouped = new Map<number, Enrollment[]>();
        for (const e of enrollments) {
          if (!grouped.has(e.associateId)) grouped.set(e.associateId, []);
          grouped.get(e.associateId)!.push(e);
        }
        const enrollmentBatchMap = new Map<number, number>(); // associateId → batchId
        grouped.forEach((list, associateId) => {
          list.sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
          enrollmentBatchMap.set(associateId, list[0].batchId);
        });

        // Enrich each associate with fullName/email from users and batchId from enrollments
        const enriched: Associate[] = associates.map((a: Associate) => {
          const u = userMap.get(a.userId);
          const enrolledBatchId = enrollmentBatchMap.get(a.id) ?? 0;
          return {
            ...a,
            ...(u ? { fullName: u.fullName || u.username, email: u.email } : {}),
            batchId: enrolledBatchId   // always reflects current enrollment state
          };
        });

        if (this.isAssociate) {
          const userId = this.auth.getUserId();
          this.myProfile = enriched.find(a => a.userId === userId) ?? enriched[0] ?? null;
          this.dataSource.data = this.myProfile ? [this.myProfile] : [];
        } else {
          this.dataSource.data = enriched;
        }
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => { this.snack.open('Failed to load associates', 'Close', { duration: 3000 }); this.loading = false; }
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

  isBatchAssigned(a: Associate): boolean {
    const id = a.batchId ?? a.currentBatchId ?? 0;
    return !!id && id !== 0;
  }
}
