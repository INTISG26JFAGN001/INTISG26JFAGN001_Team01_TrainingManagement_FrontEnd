import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProjectService } from '../../../core/services/project.service';
import { BatchService } from '../../../core/services/batch.service';
import { Batch, Project } from '../../../core/models';
import { ProjectReviewDialogComponent } from './project-review-dialog.component';

@Component({
  selector: 'app-project-review',
  templateUrl: './project-review.component.html',
  styleUrls: ['./project-review.component.scss']
})
export class ProjectReviewComponent implements OnInit {
  batches: Batch[] = [];
  allProjects: Project[] = [];
  batchSearch = '';
  loading = false;

  dataSource = new MatTableDataSource<Project>();
  displayedColumns = ['title', 'repoUrl', 'action'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private svc: ProjectService,
    private batchSvc: BatchService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      batches: this.batchSvc.getAll().pipe(catchError(() => of([]))),
      projects: this.svc.getProjects().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ batches, projects }) => {
        this.batches = batches;
        this.allProjects = projects;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getBatchId(): number | null {
    const m = this.batchSearch.match(/^#(\d+)/);
    if (m) return +m[1];
    if (/^\d+$/.test(this.batchSearch.trim())) return +this.batchSearch.trim();
    return null;
  }

  onBatchInput(): void {
    const batchId = this.getBatchId();
    if (!batchId) {
      this.dataSource.data = [];
      return;
    }
    const filtered = this.allProjects.filter(p => p.batchId === batchId);
    this.dataSource.data = filtered;
    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  openReviewDialog(project: Project): void {
    this.dialog.open(ProjectReviewDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { projectId: project.id, title: project.title }
    }).afterClosed().subscribe(result => {
      if (result) { this.onBatchInput(); }
    });
  }
}
