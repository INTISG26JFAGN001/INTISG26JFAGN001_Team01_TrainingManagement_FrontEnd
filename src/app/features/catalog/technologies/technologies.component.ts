import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogService } from '../../../core/services/catalog.service';
import { Technology } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TechFormDialogComponent } from './tech-form-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-technologies', templateUrl: './technologies.component.html', styleUrls: ['./technologies.component.scss'] })
export class TechnologiesComponent implements OnInit {
  displayedColumns = ['id', 'name', 'actions'];
  dataSource = new MatTableDataSource<Technology>();
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
    this.svc.getTechnologies().subscribe({
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

  openForm(t?: Technology): void {
    this.dialog.open(TechFormDialogComponent, {
      width: '440px',
      data: t ?? null
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(t: Technology): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Technology', message: `Delete "${t.name}"?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(c => {
      console.log(c);
      if (c) this.svc.deleteTechnology(t.id).subscribe({
        next: (res) => { this.snack.open('Technology deleted', 'Close', { duration: 3000 }); this.load(); },
        error: (res) => { this.snack.open('Failed to delete', 'Close', { duration: 3000 });}
      });
    });
  }
}
