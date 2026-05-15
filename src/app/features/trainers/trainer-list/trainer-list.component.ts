import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

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
    forkJoin({
      trainers: this.svc.getAll(),
      // users enriches display names — fallback to empty so trainer list still renders if user endpoint is unavailable
      users: this.userSvc.getAll().pipe(catchError(() => of([] as User[])))
    }).subscribe({
      next: ({ trainers, users }) => {
        // Build a quick userId → User lookup map
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));

        // Enrich each trainer with fullName and email from the users list
        const enriched: Trainer[] = trainers.map(t => {
          const u = userMap.get(t.userId);
          return u ? { ...t, fullName: u.fullName || u.username, email: u.email } : t;
        });

        this.dataSource.data = enriched;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
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
