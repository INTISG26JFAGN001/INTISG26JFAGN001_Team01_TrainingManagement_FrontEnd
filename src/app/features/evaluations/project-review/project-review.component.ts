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
import { AuthService } from '../../../core/services/auth.service';
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
  loadingReviews = false;

  /** projectId → true when the current logged-in user has already submitted a review */
  reviewedByMeSet = new Set<number>();
  currentUserId = 0;

  dataSource = new MatTableDataSource<Project>();
  displayedColumns = ['title', 'repoUrl', 'status', 'action'];

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(
    private svc: ProjectService,
    private batchSvc: BatchService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUserId();
    this.loading = true;
    forkJoin({
      batches:  this.batchSvc.getAll().pipe(catchError(() => of([]))),
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
    if (!batchId) { this.dataSource.data = []; this.reviewedByMeSet.clear(); return; }

    const filtered = this.allProjects.filter(p => p.batchId === batchId);
    this.dataSource.data = filtered;

    if (!filtered.length) { this.reviewedByMeSet.clear(); return; }

    // Load reviews for all visible projects; mark those where the current user already reviewed
    this.loadingReviews = true;
    this.reviewedByMeSet.clear();
    const reviewObs = filtered.map(p => this.svc.getReviews(p.id).pipe(catchError(() => of([]))));
    forkJoin(reviewObs).subscribe({
      next: (reviewLists: any[][]) => {
        reviewLists.forEach((reviews, i) => {
          const alreadyMine = reviews.some((r: any) => Number(r.reviewerId) === this.currentUserId);
          if (alreadyMine) this.reviewedByMeSet.add(filtered[i].id);
        });
        this.loadingReviews = false;
      },
      error: () => { this.loadingReviews = false; }
    });
  }

  isReviewedByMe(project: Project): boolean { return this.reviewedByMeSet.has(project.id); }

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
