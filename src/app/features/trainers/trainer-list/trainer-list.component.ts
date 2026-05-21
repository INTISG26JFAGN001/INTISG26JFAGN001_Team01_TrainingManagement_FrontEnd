import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { TrainerService } from '../../../core/services/trainer.service';
import { UserService } from '../../../core/services/user.service';
import { Trainer, User } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TrainerFormComponent } from '../trainer-form/trainer-form.component';
import { TrainerEditFormComponent } from '../trainer-edit-form/trainer-edit-form.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-trainer-list', templateUrl: './trainer-list.component.html', styleUrls: ['./trainer-list.component.scss'] })
export class TrainerListComponent implements OnInit {
  displayedColumns = ['userId', 'fullName', 'email', 'technologies', 'actions'];
  dataSource = new MatTableDataSource<Trainer>();
  loading = true;
  isAdmin = this.auth.isAdmin();

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(
    private svc: TrainerService,
    private userSvc: UserService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    // GET /user/all is admin-only — fetch each trainer's user record individually via
    // GET /user/{id} which is accessible to all authenticated roles.
    this.svc.getAll().pipe(
      switchMap((trainers: Trainer[]) => {
        if (!trainers.length) return of({ trainers, users: [] as User[] });
        const userIds = [...new Set(trainers.map(t => t.userId))];
        return forkJoin(
          userIds.map(uid => this.userSvc.getById(uid).pipe(catchError(() => of(null))))
        ).pipe(
          map(results => ({ trainers, users: results.filter(Boolean) as User[] }))
        );
      }),
      catchError(() => of({ trainers: [] as Trainer[], users: [] as User[] }))
    ).subscribe({
      next: ({ trainers, users }) => {
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));
        const enriched: Trainer[] = trainers.map(t => {
          const u = userMap.get(t.userId);
          return u ? { ...t, fullName: u.fullName || u.username, email: u.email } : t;
        });
        this.dataSource.data = enriched;
        this.loading = false;
      },
      error: () => { this.snack.open('Failed to load trainers', 'Close', { duration: 3000 }); this.loading = false; }
    });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openForm(): void {
    this.dialog.open(TrainerFormComponent, { width: '520px' }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openEdit(t: Trainer): void {
    this.dialog.open(TrainerEditFormComponent, { width: '480px', data: t }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(t: Trainer): void {
    const displayName = t.fullName || ('User #' + t.userId);
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove Trainer',
        message: `Remove "${displayName}" as a trainer?\n\nNote: This only removes the trainer profile. Their user account will remain active.`,
        danger: true,
        confirmText: 'Remove'
      }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.svc.delete((t.trainerId ?? t.id)!).subscribe({
          next: () => { this.snack.open('Trainer profile removed. User account is still active.', 'Close', { duration: 4000 }); this.load(); },
          error: (e) => this.snack.open(e.error?.message || 'Failed to remove trainer', 'Close', { duration: 3000 })
        });
      }
    });
  }
}
