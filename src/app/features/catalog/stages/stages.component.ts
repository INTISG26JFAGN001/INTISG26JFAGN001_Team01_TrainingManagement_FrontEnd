import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogService } from '../../../core/services/catalog.service';
import { Stage } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StageFormDialogComponent } from './stage-form-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-stages', templateUrl: './stages.component.html', styleUrls: ['./stages.component.scss'] })
export class StagesComponent implements OnInit {
  displayedColumns = ['id', 'name', 'type', 'course', 'order', 'actions'];
  dataSource = new MatTableDataSource<Stage>();
  loading = true;
  canEdit = ['ROLE_ADMIN', 'ROLE_TECH_LEAD'].includes(this.auth.getRole() ?? '');

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(
    private svc: CatalogService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getStages().subscribe({
      next: d => {
        this.dataSource.data = d;

        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openForm(s?: Stage): void {
    this.dialog.open(StageFormDialogComponent, {
      width: '500px',
      data: s ?? null
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(s: Stage): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Stage', message: `Delete "${s.name}"?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(c => {
      if (c) this.svc.deleteStage(s.id).subscribe({
        next: () => { this.snack.open('Stage deleted', 'Close', { duration: 3000 }); this.load(); },
        error: () => this.snack.open('Failed to delete', 'Close', { duration: 3000 })
      });
    });
  }

}
