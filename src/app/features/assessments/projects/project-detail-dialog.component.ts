import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Review } from '../../../core/models';

@Component({
  selector: 'app-project-detail-dialog',
  template: `
    <!-- Title -->
    <h2 mat-dialog-title class="detail-title">
      <mat-icon style="color:#34d399">work</mat-icon>
      <span>Project Details</span>
      <span class="id-chip">#{{ data.projectId }}</span>
    </h2>

    <mat-dialog-content class="detail-content">

      <!-- Loading -->
      <div *ngIf="loading" class="loading-center">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading project details…</p>
      </div>

      <ng-container *ngIf="!loading && project">

        <!-- Info strip -->
        <div class="info-strip">
          <div class="info-cell">
            <span class="info-label">Title</span>
            <span class="info-value">{{ project.title }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Batch</span>
            <span class="info-value"><span class="id-chip">#{{ project.batchId }}</span></span>
          </div>
          <div class="info-cell">
            <span class="info-label">Repository</span>
            <span class="info-value">
              <a *ngIf="project.repoUrl" [href]="project.repoUrl" target="_blank" class="repo-link">
                <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle">open_in_new</mat-icon>
                View Repo
              </a>
              <span *ngIf="!project.repoUrl">—</span>
            </span>
          </div>
        </div>

        <!-- Reviews Tab -->
        <mat-tab-group animationDuration="150ms">
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:6px">rate_review</mat-icon>
              Reviews ({{ reviews.length }})
            </ng-template>

            <div class="tab-body">
              <div *ngIf="reviews.length === 0" class="no-data">No reviews yet for this project.</div>

              <table *ngIf="reviews.length > 0" mat-table [dataSource]="reviews" class="results-table">
                <ng-container matColumnDef="reviewer">
                  <th mat-header-cell *matHeaderCellDef>Reviewer</th>
                  <td mat-cell *matCellDef="let r">{{ r.reviewerName || ('#' + r.reviewerId) }}</td>
                </ng-container>
                <ng-container matColumnDef="score">
                  <th mat-header-cell *matHeaderCellDef>Score</th>
                  <td mat-cell *matCellDef="let r" style="font-weight:600">{{ r.score }}</td>
                </ng-container>
                <ng-container matColumnDef="comments">
                  <th mat-header-cell *matHeaderCellDef>Comments</th>
                  <td mat-cell *matCellDef="let r">{{ r.comments || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="reviewDate">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let r" style="font-size:12px;color:var(--text-secondary)">
                    {{ r.reviewDate | date:'dd MMM yyyy' }}
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="reviewCols"></tr>
                <tr mat-row *matRowDef="let row; columns: reviewCols;"></tr>
              </table>
            </div>
          </mat-tab>
        </mat-tab-group>

      </ng-container>

    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:12px 24px">
      <button mat-stroked-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 17px; font-weight: 600; flex-wrap: wrap;
    }
    .detail-content { min-width: 620px; max-height: 75vh; padding: 0 24px 8px; }
    .loading-center { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px; gap:12px; color:var(--text-secondary); }

    /* Info strip */
    .info-strip { display:flex; flex-wrap:wrap; gap:0; border:1px solid var(--border,#e0e0e0); border-radius:8px; overflow:hidden; margin-bottom:16px; }
    .info-cell { display:flex; flex-direction:column; gap:2px; padding:10px 16px; flex:1; min-width:120px; border-right:1px solid var(--border,#e0e0e0); background:var(--bg-input,#fafafa); }
    .info-cell:last-child { border-right: none; }
    .info-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted,#9e9e9e); }
    .info-value { font-size:13px; font-weight:600; color:var(--text-primary,#1a1a1a); }

    /* chips */
    .id-chip { display:inline-block; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700; font-family:monospace; background:rgba(0,198,255,.08); color:var(--accent,#00c6ff); border:1px solid rgba(0,198,255,.2); }

    /* Tab body */
    .tab-body { padding: 16px 0 8px; }
    .no-data { text-align:center; padding:32px; color:var(--text-secondary); font-size:13px; }

    /* Repo link */
    .repo-link { color:var(--accent); text-decoration:none; font-size:13px; display:inline-flex; align-items:center; gap:4px; }
    .repo-link:hover { text-decoration:underline; }

    /* Reviews table */
    .results-table { width:100%; background:transparent; }
    ::ng-deep .results-table th { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-secondary); border-bottom:1px solid var(--border); }
    ::ng-deep .results-table td { font-size:13px; color:var(--text-primary); border-bottom:1px solid var(--border); }
    ::ng-deep .results-table tr:last-child td { border-bottom:none; }
  `]
})
export class ProjectDetailDialogComponent implements OnInit {
  project: Project | null = null;
  reviews: Review[] = [];
  loading = true;
  reviewCols = ['reviewer', 'score', 'comments', 'reviewDate'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { projectId: number; title: string },
    private svc: ProjectService
  ) {}

  ngOnInit(): void {
    forkJoin({
      project: this.svc.getProject(this.data.projectId),
      reviews: this.svc.getReviews(this.data.projectId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ project, reviews }) => {
        this.project = project;
        this.reviews = reviews;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
