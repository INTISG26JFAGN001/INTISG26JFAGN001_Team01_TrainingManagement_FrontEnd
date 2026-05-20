import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-project-list', templateUrl: './project-list.component.html', styleUrls: ['./project-list.component.scss'] })
export class ProjectListComponent implements OnInit {
  dataSource = new MatTableDataSource<Project>();
  loading = true;
  canDelete = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');
  canSubmit = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD', 'ROLE_ASSOCIATE');
  displayedColumns = ['title', 'submissionDate', 'repoUrl', 'actions'];

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(private svc: ProjectService, private dialog: MatDialog, private snack: MatSnackBar, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getProjects().subscribe({
      next: d => { this.dataSource.data = d; this.loading = false; },
      error: () => this.loading = false
    });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openForm(project?: Project): void {
    this.dialog.open(ProjectFormComponent, { width: '540px', data: project }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(p: Project): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Project', message: `Delete "${p.title}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(c => { if (c) this.svc.deleteProject(p.id).subscribe({ next: () => { this.snack.open('Deleted', 'Close', { duration: 3000 }); this.load(); } }); });
  }
}
