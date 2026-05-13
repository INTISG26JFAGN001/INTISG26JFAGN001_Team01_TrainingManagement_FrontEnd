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
import { InterviewFormComponent } from '../interview-form/interview-form.component';
import { InterviewRubricDialogComponent } from '../interview-rubric-dialog/interview-rubric-dialog.component';
import { InterviewEvaluateDialogComponent } from '../interview-evaluate-dialog/interview-evaluate-dialog.component';

@Component({
  selector: 'app-interview-list',
  templateUrl: './interview-list.component.html',
  styleUrls: ['./interview-list.component.scss']
})
export class InterviewListComponent implements OnInit {
  dataSource = new MatTableDataSource<Assessment>();
  batches: Batch[] = [];
  loading = true;
  canCreate = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');
  canEvaluate = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');

  filter = { batchId: '', status: '', category: '' };
  private allData: Assessment[] = [];

  get displayedColumns(): string[] {
    const cols = ['title', 'batch', 'category', 'dueDate', 'status'];
    if (this.canCreate) cols.push('actions');
    return cols;
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
    this.svc.getByType('INTERVIEW').subscribe({
      next: d => {
        this.allData = d;
        this.dataSource.data = d;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void {
    let data = [...this.allData];
    if (this.filter.batchId) data = data.filter(d => String(d.batchId) === this.filter.batchId);
    if (this.filter.status) data = data.filter(d => d.status === this.filter.status);
    if (this.filter.category) data = data.filter(d => (d as any).interviewCategory === this.filter.category);
    this.dataSource.data = data;
  }

  resetFilter(): void {
    this.filter = { batchId: '', status: '', category: '' };
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

  openForm(interview?: Assessment): void {
    this.dialog.open(InterviewFormComponent, { width: '620px', data: interview ?? null })
      .afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openRubrics(interview: Assessment): void {
    this.dialog.open(InterviewRubricDialogComponent, {
      width: '680px',
      data: { interviewId: interview.id, title: interview.title, status: interview.status }
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openEvaluate(interview: Assessment): void {
    this.dialog.open(InterviewEvaluateDialogComponent, {
      width: '720px',
      data: { interviewId: interview.id, title: interview.title, batchId: interview.batchId }
    }).afterClosed().subscribe(r => { if (r) this.load(); });
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
