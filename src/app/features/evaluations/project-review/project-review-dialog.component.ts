import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { Review } from '../../../core/models';

export interface ProjectReviewDialogData {
  projectId: number;
  title: string;
}

@Component({
  selector: 'app-project-review-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>rate_review</mat-icon>
      Reviews — {{ data.title }}
    </h2>

    <mat-dialog-content class="dialog-body">

      <div *ngIf="loadingReviews" class="loading-center"><mat-spinner diameter="32"></mat-spinner></div>

      <!-- Existing reviews -->
      <div *ngIf="!loadingReviews">
        <p class="section-label">Existing Reviews ({{ reviews.length }})</p>

        <div *ngIf="reviews.length === 0" class="no-reviews">
          No reviews yet for this project.
        </div>

        <div *ngFor="let review of reviews" class="review-card">
          <div class="review-header">
            <div class="reviewer-info">
              <div class="avatar">{{ getReviewerInitial(review.reviewerId) }}</div>
              <span class="reviewer-id">Reviewer #{{ review.reviewerId }}</span>
              <span class="type-chip" [ngClass]="review.type.toLowerCase()">{{ review.type }}</span>
            </div>
            <span class="score-badge">{{ review.score }}<span class="score-max">/100</span></span>
          </div>
          <p class="review-comments">{{ review.comments }}</p>
        </div>

        <!-- Add Review Form -->
        <mat-divider style="margin: 20px 0;"></mat-divider>
        <p class="section-label">Add Review</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Score (0–100)</mat-label>
            <input matInput type="number" formControlName="score" min="0" max="100" placeholder="e.g. 85" />
            <mat-error *ngIf="form.get('score')?.hasError('required')">Score is required</mat-error>
            <mat-error *ngIf="form.get('score')?.hasError('min') || form.get('score')?.hasError('max')">
              Score must be between 0 and 100
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="TECH">TECH</mat-option>
              <mat-option value="SCRUM">SCRUM</mat-option>
            </mat-select>
            <mat-error>Select a review type</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Comments</mat-label>
            <textarea matInput formControlName="comments" rows="3"
                      placeholder="Enter your review comments..."></textarea>
            <mat-error>Comments are required</mat-error>
          </mat-form-field>

          <div class="form-actions">
            <button mat-flat-button color="primary" type="submit"
                    [disabled]="form.invalid || saving">
              <mat-icon>{{ saving ? 'hourglass_empty' : 'add_comment' }}</mat-icon>
              {{ saving ? 'Submitting...' : 'Submit Review' }}
            </button>
          </div>
        </form>
      </div>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="submitted">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 700; color: var(--text-primary);
      mat-icon { color: var(--accent); }
    }
    .dialog-body { min-width: 480px; max-width: 660px; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 30px; }

    .section-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .5px; color: var(--text-secondary); margin: 0 0 10px;
    }

    .no-reviews {
      padding: 20px; text-align: center;
      color: var(--text-muted); font-size: 13px;
      background: var(--bg-input); border-radius: 8px; margin-bottom: 8px;
    }

    .review-card {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
    }

    .review-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
    }

    .reviewer-info { display: flex; align-items: center; gap: 8px; }

    .avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--accent-glow, rgba(0,198,255,.1));
      color: var(--accent); font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(0,198,255,.2);
    }

    .reviewer-id { font-size: 13px; font-weight: 600; color: var(--text-primary); }

    .type-chip {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;

      &.tech  { background: rgba(0,198,255,.12); color: var(--accent); }
      &.scrum { background: rgba(167,139,250,.12); color: #a78bfa; }
    }

    .score-badge {
      font-size: 20px; font-weight: 700; color: var(--accent);
      .score-max { font-size: 12px; color: var(--text-secondary); }
    }

    .review-comments {
      font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5;
    }

    .form-actions {
      display: flex; justify-content: flex-end; margin-top: 8px;
    }
  `]
})
export class ProjectReviewDialogComponent implements OnInit {
  reviews: Review[] = [];
  loadingReviews = true;
  saving = false;
  submitted = false;

  form = this.fb.group({
    score:    [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    comments: ['', Validators.required],
    type:     ['TECH', Validators.required]
  });

  constructor(
    private fb: FormBuilder,
    private svc: ProjectService,
    private auth: AuthService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<ProjectReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProjectReviewDialogData
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loadingReviews = true;
    this.svc.getReviews(this.data.projectId).pipe(
      catchError(() => of([]))
    ).subscribe(reviews => {
      this.reviews = reviews;
      this.loadingReviews = false;
    });
  }

  getReviewerInitial(reviewerId: number): string {
    return String(reviewerId).charAt(0);
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const v = this.form.value;
    const payload = {
      reviewerId: this.auth.getUserId(),
      score: v.score!,
      comments: v.comments!,
      type: v.type!
    };

    this.svc.createReview(this.data.projectId, payload).subscribe({
      next: () => {
        this.snack.open('Review submitted successfully', 'Close', { duration: 3000 });
        this.submitted = true;
        this.saving = false;
        this.form.reset({ type: 'TECH' });
        this.loadReviews();
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to submit review', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
