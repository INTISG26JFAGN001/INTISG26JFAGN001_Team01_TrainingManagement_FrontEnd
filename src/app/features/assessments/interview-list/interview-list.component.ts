import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { Assessment, Batch } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';
import { InterviewFormComponent } from '../interview-form/interview-form.component';
import { InterviewRubricDialogComponent } from '../interview-rubric-dialog/interview-rubric-dialog.component';
import { InterviewResultsDialogComponent } from './interview-results-dialog.component';
import { InterviewDetailDialogComponent } from './interview-detail-dialog.component';

@Component({
  selector: 'app-interview-list',
  templateUrl: './interview-list.component.html',
  styleUrls: ['./interview-list.component.scss']
})
export class InterviewListComponent implements OnInit {
  dataSource = new MatTableDataSource<Assessment>();
  batches: Batch[] = [];
  loading = true;
  canCreate  = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');
  canEvaluate = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');

  filter = { batchId: '', status: '', category: '', fromDate: '', toDate: '' };
  private allData: Assessment[] = [];

  get displayedColumns(): string[] {
    const cols = ['title', 'batch', 'category', 'dueDate', 'status'];
    if (this.canCreate) cols.push('actions');
    return cols;
  }

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(
    private svc: AssessmentService,
    private batchSvc: BatchService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe(b => { this.batches = b; this.load(); });
  }

  load(): void {
    this.loading = true;
    this.svc.getByType('INTERVIEW').subscribe({
      next: d => {
        // Auto-close: any PUBLISHED interview whose dueDate is in the past
        // gets updated to CLOSED so it no longer accepts evaluations.
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdue = d.filter(i =>
          i.status === 'PUBLISHED' &&
          (i as any).dueDate &&
          new Date((i as any).dueDate) < today
        );
        if (overdue.length > 0) {
          const updates$ = overdue.map(i =>
            this.svc.update(i.id, { status: 'CLOSED' as any })
          );
          forkJoin(updates$).subscribe({
            next: () => {
              this.snack.open(
                `${overdue.length} interview${overdue.length > 1 ? 's' : ''} auto-closed (past due date)`,
                'Close', { duration: 4000 }
              );
              this.loadData();
            },
            error: () => this.loadData()
          });
        } else {
          this.allData = d;
          this.dataSource.data = d;
          this.loading = false;
        }
      },
      error: () => { this.loading = false; }
    });
  }

  /** Reload without triggering auto-close again */
  private loadData(): void {
    this.svc.getByType('INTERVIEW').subscribe({
      next: d => {
        this.allData = d;
        this.dataSource.data = d;

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void {
    let data = [...this.allData];
    if (this.filter.batchId) { const s = this.filter.batchId.trim().toLowerCase(); data = data.filter(d => `#${d.batchId} — ${this.getBatchName(d.batchId)}`.toLowerCase().includes(s)); }
    if (this.filter.status)   data = data.filter(d => d.status === this.filter.status);
    if (this.filter.category) data = data.filter(d => (d as any).interviewCategory === this.filter.category);
    if (this.filter.fromDate) data = data.filter(d => !!d.dueDate && new Date(d.dueDate) >= new Date(this.filter.fromDate));
    if (this.filter.toDate)   data = data.filter(d => !!d.dueDate && new Date(d.dueDate) <= new Date(this.filter.toDate));
    this.dataSource.data = data;
  }

  resetFilter(): void {
    this.filter = { batchId: '', status: '', category: '', fromDate: '', toDate: '' };
    this.dataSource.data = this.allData;
  }

  getBatchName(id: number): string {
    const b = this.batches.find(b => b.id === id);
    return b?.courseNames?.join(', ') || `Batch #${id}`;
  }

  getCategoryLabel(cat: string): string {
    return { INTERIM: 'Interim', FINAL: 'Final' }[cat] ?? cat;
  }

  /* ── Actions ── */

  openDetail(interview: Assessment): void {
    this.dialog.open(InterviewDetailDialogComponent, {
      width: '780px', maxHeight: '90vh',
      data: { interviewId: interview.id, title: interview.title }
    });
  }

  openForm(interview?: Assessment): void {
    if (interview) {
      // Fetch full interview details before opening edit dialog —
      // the list only holds AssessmentSummaryResponse which may lack
      // scheduledDateTime, evaluatorRole, maxScore, dueDate, rubrics.
      this.svc.getInterview(interview.id).subscribe({
        next: fullInterview => {
          this.dialog.open(InterviewFormComponent, { width: '700px', maxHeight: '90vh', data: fullInterview })
            .afterClosed().subscribe(r => { if (r) this.load(); });
        },
        error: () => this.snack.open('Failed to load interview details', 'Close', { duration: 3000 })
      });
    } else {
      this.dialog.open(InterviewFormComponent, { width: '700px', maxHeight: '90vh', data: null })
        .afterClosed().subscribe(r => { if (r) this.load(); });
    }
  }

  openRubrics(interview: Assessment): void {
    this.dialog.open(InterviewRubricDialogComponent, {
      width: '680px',
      data: { interviewId: interview.id, title: interview.title, status: interview.status }
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  viewResults(interview: Assessment): void {
    this.dialog.open(InterviewResultsDialogComponent, {
      width: '720px', maxHeight: '90vh',
      data: { interviewId: interview.id, title: interview.title }
    });
  }

  delete(a: Assessment): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Interview', message: `Delete "${a.title}"?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(c => {
      if (c) this.svc.delete(a.id).subscribe({
        next: () => { this.snack.open('Interview deleted', 'Close', { duration: 3000 }); this.load(); }
      });
    });
  }
}
