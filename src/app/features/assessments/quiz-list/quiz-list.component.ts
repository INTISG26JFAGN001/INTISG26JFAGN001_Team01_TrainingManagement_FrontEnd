import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { forkJoin } from 'rxjs';
import { Assessment, Batch } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';
import { QuizFormComponent } from '../quiz-form/quiz-form.component';
import { QuizResultsDialogComponent } from './quiz-results-dialog.component';
import { QuizDetailDialogComponent } from './quiz-detail-dialog.component';

@Component({ selector: 'app-quiz-list', templateUrl: './quiz-list.component.html', styleUrls: ['./quiz-list.component.scss'] })
export class QuizListComponent implements OnInit {
  dataSource = new MatTableDataSource<Assessment>();
  batches: Batch[] = [];
  loading = true;
  canCreate = ['ROLE_ADMIN', 'ROLE_TRAINER'].includes(this.auth.getRole() ?? '');

  filter = { fromDate: '', toDate: '', batchId: '', status: '' };

  private allData: Assessment[] = [];

  get displayedColumns(): string[] {
    return this.canCreate
      ? ['title', 'batch', 'status', 'dueDate', 'actions']
      : ['title', 'batch', 'status', 'dueDate'];
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

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
    this.svc.getByType('QUIZ').subscribe({
      next: d => {
        // Auto-close: any PUBLISHED quiz whose dueDate is in the past
        // gets updated to CLOSED so it no longer accepts submissions.
        // The backend can also handle this via a scheduled task, but we
        // trigger it eagerly here on every load for immediate consistency.
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdue = d.filter(q =>
          q.status === 'PUBLISHED' &&
          (q as any).dueDate &&
          new Date((q as any).dueDate) < today
        );
        if (overdue.length > 0) {
          const updates$ = overdue.map(q =>
            this.svc.update(q.id, { status: 'CLOSED' as any })
          );
          forkJoin(updates$).subscribe({
            next: () => {
              this.snack.open(
                `${overdue.length} quiz${overdue.length > 1 ? 'zes' : ''} auto-closed (past due date)`,
                'Close', { duration: 4000 }
              );
              // Reload after closing so the table reflects CLOSED status
              this.loadData();
            },
            error: () => this.loadData()
          });
        } else {
          this.allData = d;
          this.dataSource.data = d;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.loading = false;
        }
      },
      error: () => this.loading = false
    });
  }

  /** Internal: just store the data without triggering auto-close again */
  private loadData(): void {
    this.svc.getByType('QUIZ').subscribe({
      next: d => {
        this.allData = d;
        this.dataSource.data = d;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter(): void {
    let data = [...this.allData];
    if (this.filter.batchId) { const s = this.filter.batchId.trim().toLowerCase(); data = data.filter(d => `#${d.batchId} — ${this.getBatchName(d.batchId)}`.toLowerCase().includes(s)); }
    if (this.filter.status)   data = data.filter(d => d.status === this.filter.status);
    if (this.filter.fromDate) data = data.filter(d => !!d.dueDate && new Date(d.dueDate) >= new Date(this.filter.fromDate));
    if (this.filter.toDate)   data = data.filter(d => !!d.dueDate && new Date(d.dueDate) <= new Date(this.filter.toDate));
    this.dataSource.data = data;
  }

  resetFilter(): void {
    this.filter = { fromDate: '', toDate: '', batchId: '', status: '' };
    this.dataSource.data = this.allData;
  }

  getBatchName(id: number): string { const b = this.batches.find(b => b.id === id); return b?.courseNames?.join(', ') || `Batch #${id}`; }

  openForm(quiz?: Assessment): void {
    if (quiz) {
      // Fetch full quiz details (GET /assessments/quiz/{id}) before opening the edit
      // dialog — the list only holds AssessmentSummaryResponse which lacks
      // durationMinutes, passingMarks, dueDate, maxScore, questions.
      this.svc.getQuiz(quiz.id).subscribe({
        next: fullQuiz => {
          this.dialog.open(QuizFormComponent, { width: '700px', maxHeight: '90vh', data: fullQuiz })
            .afterClosed().subscribe(r => { if (r) this.load(); });
        },
        error: () => this.snack.open('Failed to load quiz details', 'Close', { duration: 3000 })
      });
    } else {
      this.dialog.open(QuizFormComponent, { width: '700px', maxHeight: '90vh', data: null })
        .afterClosed().subscribe(r => { if (r) this.load(); });
    }
  }

  openDetail(quiz: Assessment): void {
    this.dialog.open(QuizDetailDialogComponent, {
      width: '900px', maxHeight: '90vh',
      data: { quizId: quiz.id, title: quiz.title }
    });
  }

  viewResults(quiz: Assessment): void {
    this.dialog.open(QuizResultsDialogComponent, {
      width: '680px', maxHeight: '90vh',
      data: { quizId: quiz.id, title: quiz.title }
    });
  }

  delete(a: Assessment): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Quiz', message: `Delete "${a.title}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(c => { if (c) this.svc.delete(a.id).subscribe({ next: () => { this.snack.open('Deleted', 'Close', { duration: 3000 }); this.load(); } }); });
  }
}
