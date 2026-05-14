import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { UserService } from '../../../core/services/user.service';
import { Associate, Batch, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { AssociateFormComponent } from '../associate-form/associate-form.component';
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
      associates: this.svc.getAll(),
      batches: this.batchSvc.getAll(),
      users: this.userSvc.getAll()
    }).subscribe({
      next: ({ associates, batches, users }) => {
        this.batches = batches;

        // Build a quick userId → User lookup map
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));

        // Enrich each associate with fullName and email from the users list
        const enriched: Associate[] = associates.map((a: Associate) => {
          const u = userMap.get(a.userId);
          return u ? { ...a, fullName: u.fullName || u.username, email: u.email } : a;
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
    const b = this.batches.find(b => b.id === id);
    return b ? (b.courseNames?.join(', ') || `Batch #${id}`) : `Batch #${id}`;
  }

  isBatchAssigned(a: Associate): boolean {
    const id = a.batchId ?? a.currentBatchId ?? 0;
    return !!id && id !== 0;
  }
}
