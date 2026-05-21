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
import { Associate, Batch, Enrollment, Trainer, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { AssociateFormComponent } from '../associate-form/associate-form.component';
import { AssociateEditFormComponent } from '../associate-edit-form/associate-edit-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-associate-list',
  templateUrl: './associate-list.component.html',
  styleUrls: ['./associate-list.component.scss']
})
export class AssociateListComponent implements OnInit {
  dataSource = new MatTableDataSource<Associate>();
  loading = true;
  isAdmin = this.auth.isAdmin();
  isAssociate = this.auth.isAssociate();
  myProfile: Associate | null = null;
  batches: Batch[] = [];

  get displayedColumns(): string[] {
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
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    if (this.isAssociate) {
      this.loadMyProfile();
      return;
    }
    forkJoin({
      associates:  this.svc.getAll(),
      users:       this.userSvc.getAll().pipe(catchError(() => of([] as User[]))),
      batches:       this.batchSvc.getAll().pipe(catchError(()=> of([] as Batch[]))), 
      enrollments: this.svc.getAllEnrollments().pipe(catchError(() => of([] as Enrollment[])))
    }).subscribe({
      next: ({ associates, users, batches, enrollments }) => {
        if(this.auth.isTrainer()){
          let updatedBatches = [];
          for(let b of batches){
            
          }
          console.log(this.myProfile?.userId);
        }
        console.log("Associates: "+associates.map((e)=>e.userId));
        console.log("Users: "+users.map((e)=>e.fullName));
        console.log("Batches: "+batches.map(e=>e.courseNames));
        console.log("Enrollments: "+enrollments.map(e=>e.associateId));
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));
        const STATUS_PRIORITY: Record<string, number> = { ACTIVE: 0, ENROLLED: 1, COMPLETED: 2 };
        const safeEnrollments: Enrollment[] = Array.isArray(enrollments) ? enrollments : [];

        // Build associateId → batchId map from enrollments
        const grouped = new Map<number, Enrollment[]>();
        for (const e of safeEnrollments) {
          if (!grouped.has(e.associateId)) grouped.set(e.associateId, []);
          grouped.get(e.associateId)!.push(e);
        }
        const enrollmentBatchMap = new Map<number, number>();
        console.log(grouped);
        grouped.forEach((list, associateId) => {
          list.sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
          enrollmentBatchMap.set(associateId, list[0].batchId);
        });

        const enriched: Associate[] = associates.map((a: Associate) => {
          const u = userMap.get(a.userId);
          const batchId = enrollmentBatchMap.get(a.id) ?? a.batchId ?? 0;
          return {
            ...a,
            ...(u ? { fullName: u.fullName || u.username, email: u.email } : {}),
            batchId
          };
        });

        this.dataSource.data = enriched;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => {
        this.snack.open('Failed to load associates', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private loadMyProfile(): void {
    const userId = this.auth.getUserId();
    this.svc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((associate: any) => {
        if (!associate) return of({ associate: null, user: null, batch: null });
        return forkJoin({
          user: this.userSvc.getById(userId).pipe(catchError(() => of(null))),
          enrollment: this.svc.getMyEnrollment(associate.id).pipe(catchError(() => of(null)))
        }).pipe(
          switchMap(({ user, enrollment }: any) => {
            const batchId: number | null = enrollment?.batchId ?? associate.batchId ?? null;
            if (!batchId) return of({ associate, user, batch: null });
            return this.batchSvc.getById(batchId).pipe(
              catchError(() => of(null)),
              map((batch: any) => ({ associate, user, batch }))
            );
          })
        );
      })
    ).subscribe({
      next: ({ associate, user, batch }: any) => {
        if (!associate) { this.loading = false; return; }
        this.myProfile = {
          ...associate,
          fullName: user?.fullName || user?.username || '',
          email: user?.email || '',
          batchId: batch?.id ?? associate.batchId ?? 0
        };
        if (batch) this.batches = [batch];
        this.loading = false;
      },
      error: () => {
        this.snack.open('Failed to load profile', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openAddForm(): void {
    this.dialog.open(AssociateFormComponent, { width: '480px' })
      .afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openEdit(a: Associate): void {
    this.dialog.open(AssociateEditFormComponent, { width: '420px', data: a })
      .afterClosed().subscribe(r => { if (r) this.load(); });
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
            this.snack.open('Associate profile removed.', 'Close', { duration: 4000 });
            this.load();
          },
          error: (e) => this.snack.open(e.error?.message || 'Failed to remove associate', 'Close', { duration: 3000 })
        });
      }
    });
  }

  getDisplayName(a: Associate): string {
    return a.fullName || ('User #' + a.userId);
  }

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
    const id = a.batchId ?? 0;
    return id ? `#${id}` : '—';
  }
}
