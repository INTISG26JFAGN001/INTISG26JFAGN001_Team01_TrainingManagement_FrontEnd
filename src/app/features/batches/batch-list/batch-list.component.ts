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
  displayedColumns = ['name', 'status', 'startDate', 'endDate', 'capacity', 'actions'];
  dataSource = new MatTableDataSource<Batch>();
  loading = true;
  isAdmin = this.auth.isAdmin();
  statusFilter = '';
  statuses: BatchStatus[] = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private svc: BatchService, private dialog: MatDialog, private snack: MatSnackBar, private router: Router, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const obs = this.statusFilter ? this.svc.filterByStatus(this.statusFilter as BatchStatus) : this.svc.getAll();
    obs.subscribe({ next: (d) => { this.dataSource.data = d; this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; this.loading = false; }, error: () => this.loading = false });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openForm(): void { this.dialog.open(BatchFormComponent, { width: '540px' }).afterClosed().subscribe(r => { if (r) this.load(); }); }

  viewDetail(id: number): void { this.router.navigate(['/batches', id]); }

  delete(b: Batch): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Batch', message: `Delete batch "${b.name}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(c => { if (c) this.svc.delete(b.id).subscribe({ next: () => { this.snack.open('Batch deleted', 'Close', { duration: 3000 }); this.load(); } }); });
  }

  getStatusClass(s: string): string {
    return { ONGOING: 'status-ongoing', UPCOMING: 'status-upcoming', COMPLETED: 'status-completed', CANCELLED: 'status-cancelled' }[s] ?? '';
  }
}
