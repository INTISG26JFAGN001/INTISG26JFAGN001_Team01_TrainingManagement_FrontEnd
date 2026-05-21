import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { BatchService } from '../../../core/services/batch.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { Batch, BatchStatus } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { BatchFormComponent } from '../batch-form/batch-form.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-batch-list', templateUrl: './batch-list.component.html', styleUrls: ['./batch-list.component.scss'] })
export class BatchListComponent implements OnInit {
  displayedColumns = ['batchId', 'status', 'startDate', 'endDate', 'actions'];
  dataSource = new MatTableDataSource<Batch>();
  loading = true;
  isAdmin = this.auth.isAdmin();
  statusFilter = '';
  statuses: BatchStatus[] = ['UPCOMING', 'ACTIVE', 'COMPLETED'];

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  isTrainer = this.auth.isTrainer();

  constructor(
    private svc: BatchService,
    private trainerSvc: TrainerService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const userId = this.auth.getUserId();

    if (!this.isTrainer) {
      const obs = this.statusFilter ? this.svc.filterByStatus(this.statusFilter as BatchStatus) : this.svc.getAll();
      obs.subscribe({
        next: (d) => { this.dataSource.data = d; this.loading = false; },
        error: () => this.loading = false
      });
      return;
    }

    // Find the trainer record to get their primary key, then fetch their batches
    this.trainerSvc.getAll().pipe(
      catchError(() => of([])),
      switchMap((trainers: any[]) => {
        const me = trainers.find(t => Number(t.userId) === Number(userId));
        // Candidate IDs to try with filterByTrainer: trainer PK first, then userId as fallback
        const candidates = [...new Set(
          [me?.trainerId, me?.id, userId].filter((v): v is number => v != null)
        )];
        return this.tryFilterByTrainer(candidates);
      })
    ).subscribe({
      next: (batches: Batch[]) => {
        const filtered = this.statusFilter ? batches.filter(b => b.status === this.statusFilter as BatchStatus) : batches;
        this.dataSource.data = filtered;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  private tryFilterByTrainer(ids: number[]): Observable<Batch[]> {
    if (!ids.length) return of([]);
    const [head, ...tail] = ids;
    return this.svc.filterByTrainer(head).pipe(
      catchError(() => of([])),
      switchMap((result: Batch[]) => result.length > 0 ? of(result) : this.tryFilterByTrainer(tail))
    );
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  viewDetail(id: number): void { this.router.navigate(['/batches', id]); }

  openForm(): void {
    this.dialog.open(BatchFormComponent, { width: '540px' }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(b: Batch): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Batch', message: `Delete Batch #${b.id}?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(c => {
      if (c) this.svc.delete(b.id).subscribe({
        next: () => { this.snack.open('Batch deleted', 'Close', { duration: 3000 }); this.load(); },
        error: () => this.snack.open('Failed to delete batch', 'Close', { duration: 3000 })
      });
    });
  }

  getStatusClass(s: string): string {
    return { ACTIVE: 'status-ongoing', UPCOMING: 'status-upcoming', COMPLETED: 'status-completed' }[s] ?? '';
  }

  /** Safely format a date — handles ISO strings, date-only, and Java LocalDate array [y, m, d] */
  formatDate(val: any): string {
    if (!val) return '—';
    // Java LocalDate serialized as [year, month, day] array (month is 1-based)
    if (Array.isArray(val) && val.length >= 3) {
      const [y, m, day] = val;
      val = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
