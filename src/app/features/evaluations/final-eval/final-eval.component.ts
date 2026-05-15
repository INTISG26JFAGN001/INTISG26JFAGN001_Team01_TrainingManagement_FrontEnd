import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProjectService } from '../../../core/services/project.service';
import { BatchService } from '../../../core/services/batch.service';
import { Batch, Associate, Evaluation } from '../../../core/models';

@Component({
  selector: 'app-final-eval',
  templateUrl: './final-eval.component.html',
  styleUrls: ['./final-eval.component.scss']
})
export class FinalEvalComponent implements OnInit {
  batches: Batch[] = [];
  associates: Associate[] = [];
  batchSearch = '';
  batchId: number | null = null;
  loading = false;
  calculating = false;

  dataSource = new MatTableDataSource<Evaluation>();
  displayedColumns = ['associate', 'interimScore', 'finalScore', 'status'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private svc: ProjectService,
    private batchSvc: BatchService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe({
      next: b => this.batches = b,
      error: () => {}
    });
  }

  getBatchId(): number | null {
    const m = this.batchSearch.match(/^#(\d+)/);
    if (m) return +m[1];
    if (/^\d+$/.test(this.batchSearch.trim())) return +this.batchSearch.trim();
    return null;
  }

  onBatchInput(): void {
    this.batchId = this.getBatchId();
    this.dataSource.data = [];
    this.associates = [];
    if (!this.batchId) return;

    this.loading = true;
    forkJoin({
      evaluations: this.svc.getEvaluationsByBatch(this.batchId).pipe(catchError(() => of([]))),
      details:     this.batchSvc.getDetails(this.batchId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ evaluations, details }) => {
        this.associates = (details as any)?.associates ?? [];
        this.dataSource.data = evaluations;
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  calculate(): void {
    if (!this.batchId || this.calculating) return;
    this.calculating = true;
    this.svc.calculateEvaluations(this.batchId).subscribe({
      next: () => {
        this.snack.open('Evaluations calculated successfully', 'Close', { duration: 3000 });
        this.calculating = false;
        this.onBatchInput();
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to calculate evaluations', 'Close', { duration: 4000 });
        this.calculating = false;
      }
    });
  }

  getAssociateName(associateId: number): string {
    const a = this.associates.find(a => a.id === associateId);
    return a?.fullName || ('Associate #' + associateId);
  }

  getAssociateInitial(associateId: number): string {
    const a = this.associates.find(a => a.id === associateId);
    const name = a?.fullName || '';
    return name.charAt(0).toUpperCase() || 'A';
  }

  getStatusClass(status: string): string {
    if (!status) return 'pending';
    return status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'pending';
  }

  getScoreBarColor(score: number): string {
    if (score >= 70) return '#34d399';
    if (score >= 50) return '#fbbf24';
    return '#ef4444';
  }
}
