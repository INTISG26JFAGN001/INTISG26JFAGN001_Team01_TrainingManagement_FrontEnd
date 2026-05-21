import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ProjectService } from '../../../core/services/project.service';
import { BatchService } from '../../../core/services/batch.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project, Batch } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProjectFormDialogComponent } from './project-form-dialog.component';
import { ProjectDetailDialogComponent } from './project-detail-dialog.component';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  displayedColumns = ['title', 'batch', 'repoUrl', 'actions'];
  dataSource = new MatTableDataSource<Project>();
  allProjects: Project[] = [];
  batches: Batch[] = [];
  loading = true;

  filter = { batchId: '' };

  canCreate = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(
    private svc: ProjectService,
    private batchSvc: BatchService,
    private trainerSvc: TrainerService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const batches$ = this.auth.isTrainer()
      ? this.trainerSvc.getAll().pipe(
          switchMap((trainers: any[]) => {
            const me = trainers.find(t => Number(t.userId) === Number(this.auth.getUserId()));
            if (!me) return of([] as Batch[]);
            const tid = me.trainerId ?? me.id;
            if (!tid) return of([] as Batch[]);
            return this.batchSvc.filterByTrainer(tid).pipe(catchError(() => of([] as Batch[])));
          }),
          catchError(() => of([] as Batch[]))
        )
      : this.batchSvc.getAll().pipe(catchError(() => of([] as Batch[])));

    forkJoin({
      projects: this.svc.getProjects().pipe(catchError(() => of([]))),
      batches:  batches$
    }).subscribe(({ projects, batches }) => {
      this.batches = batches;
      if (this.auth.isTrainer()) {
        const batchIds = new Set(batches.map((b: Batch) => b.id));
        this.allProjects = projects.filter((p: Project) => batchIds.has(Number(p.batchId)));
      } else {
        this.allProjects = projects;
      }
      this.applyFilter();
      this.loading = false;
    });
  }

  applyFilter(): void {
    let data = [...this.allProjects];
    if (this.filter.batchId) { const s = this.filter.batchId.trim().toLowerCase(); data = data.filter(p => `#${p.batchId} — ${this.getBatchName(p.batchId)}`.toLowerCase().includes(s)); }
    this.dataSource.data = data;
  }

  resetFilter(): void {
    this.filter = { batchId: '' };
    this.applyFilter();
  }

  getBatchName(id: number): string {
    const b = this.batches.find(b => b.id === id);
    return b?.courseNames?.join(', ') || 'No course';
  }

  openDetail(p: Project): void {
    this.dialog.open(ProjectDetailDialogComponent, {
      width: '680px',
      data: { projectId: p.id, title: p.title }
    });
  }

  openForm(project?: Project): void {
    this.dialog.open(ProjectFormDialogComponent, {
      width: '540px',
      data: project ?? null
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(p: Project): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Project', message: `Delete "${p.title}"?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(c => {
      if (c) this.svc.deleteProject(p.id).subscribe({
        next: () => { this.snack.open('Project deleted', 'Close', { duration: 3000 }); this.load(); },
        error: () => this.snack.open('Failed to delete', 'Close', { duration: 3000 })
      });
    });
  }
}
