import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { Assessment, Batch } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';
import { QuizFormComponent } from '../quiz-form/quiz-form.component';

@Component({ selector: 'app-quiz-list', templateUrl: './quiz-list.component.html', styleUrls: ['./quiz-list.component.scss'] })
export class QuizListComponent implements OnInit {
  dataSource = new MatTableDataSource<Assessment>();
  batches: Batch[] = [];
  loading = true;
  canCreate = ['ROLE_ADMIN', 'ROLE_TRAINER'].includes(this.auth.getRole() ?? '');

  filter = { fromDate: '', toDate: '', candidateId: '', batchId: '', status: '' };

  private allData: Assessment[] = [];

  get displayedColumns(): string[] {
    return this.canCreate
      ? ['title', 'batch', 'status', 'createdAt', 'actions']
      : ['title', 'batch', 'status', 'createdAt'];
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
        this.allData = d;
        this.dataSource.data = d;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyAdvancedFilter(): void {
    let data = [...this.allData];
    if (this.filter.batchId) data = data.filter(d => String(d.batchId) === String(this.filter.batchId));
    if (this.filter.status) data = data.filter(d => d.status === this.filter.status);
    if (this.filter.fromDate) data = data.filter(d => new Date(d.createdAt) >= new Date(this.filter.fromDate));
    if (this.filter.toDate) data = data.filter(d => new Date(d.createdAt) <= new Date(this.filter.toDate));
    this.dataSource.data = data;
  }

  resetFilter(): void {
    this.filter = { fromDate: '', toDate: '', candidateId: '', batchId: '', status: '' };
    this.dataSource.data = this.allData;
  }

  getBatchName(id: number): string { return this.batches.find(b => b.id === id)?.name ?? `Batch #${id}`; }

  openForm(quiz?: Assessment): void {
    this.dialog.open(QuizFormComponent, { width: '520px', data: quiz ?? null })
      .afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(a: Assessment): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Quiz', message: `Delete "${a.title}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(c => { if (c) this.svc.delete(a.id).subscribe({ next: () => { this.snack.open('Deleted', 'Close', { duration: 3000 }); this.load(); } }); });
  }
}
