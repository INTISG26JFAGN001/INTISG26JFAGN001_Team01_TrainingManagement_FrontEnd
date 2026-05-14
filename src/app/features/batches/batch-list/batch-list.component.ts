import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BatchService } from '../../../core/services/batch.service';
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private svc: BatchService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const obs = this.statusFilter ? this.svc.filterByStatus(this.statusFilter as BatchStatus) : this.svc.getAll();
    obs.subscribe({
      next: (d) => {
        this.dataSource.data = d;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => this.loading = false
    });
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

  /** Safely format a date — handles ISO, date-only, and timestamp formats */
  formatDate(val: string | undefined): string {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
