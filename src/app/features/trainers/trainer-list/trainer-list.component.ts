import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TrainerService } from '../../../core/services/trainer.service';
import { Trainer } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TrainerFormComponent } from '../trainer-form/trainer-form.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-trainer-list', templateUrl: './trainer-list.component.html', styleUrls: ['./trainer-list.component.scss'] })
export class TrainerListComponent implements OnInit {
  displayedColumns = ['fullName', 'email', 'technologies', 'actions'];
  dataSource = new MatTableDataSource<Trainer>();
  loading = true;
  isAdmin = this.auth.isAdmin();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private svc: TrainerService, private dialog: MatDialog, private snack: MatSnackBar, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getAll().subscribe({ next: d => { this.dataSource.data = d; this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; this.loading = false; }, error: () => this.loading = false });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openForm(): void { this.dialog.open(TrainerFormComponent, { width: '500px' }).afterClosed().subscribe(r => { if (r) this.load(); }); }

  delete(t: Trainer): void {
    const displayName = t.fullName || ('Trainer #' + (t.trainerId ?? t.id));
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Trainer', message: `Remove "${displayName}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(c => {
        if (c) this.svc.delete((t.trainerId ?? t.id)!).subscribe({
          next: () => { this.snack.open('Trainer removed', 'Close', { duration: 3000 }); this.load(); },
          error: (e) => this.snack.open(e.error?.message || 'Failed to remove', 'Close', { duration: 3000 })
        });
      });
  }
}
