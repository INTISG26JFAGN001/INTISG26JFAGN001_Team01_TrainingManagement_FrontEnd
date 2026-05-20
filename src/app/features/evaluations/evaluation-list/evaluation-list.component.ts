import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { BatchService } from '../../../core/services/batch.service';
import { Evaluation, Batch } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-evaluation-list', templateUrl: './evaluation-list.component.html', styleUrls: ['./evaluation-list.component.scss'] })
export class EvaluationListComponent implements OnInit {
  displayedColumns = ['associateName', 'totalScore', 'quizScore', 'interviewScore', 'projectScore'];
  dataSource = new MatTableDataSource<Evaluation>();
  batches: Batch[] = [];
  selectedBatch: number | null = null;
  loading = false;
  isAdmin = this.auth.isAdmin();
  canCalculate = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');
  isAssociate = this.auth.isAssociate();

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(private svc: ProjectService, private batchSvc: BatchService, private snack: MatSnackBar, private auth: AuthService) {}

  ngOnInit(): void { this.batchSvc.getAll().subscribe(b => this.batches = b); }

  loadEvaluations(): void {
    if (!this.selectedBatch) return;
    this.loading = true;
    this.svc.getEvaluationsByBatch(this.selectedBatch).subscribe({ next: d => { this.dataSource.data = d; this.loading = false; }, error: () => this.loading = false });
  }

  calculate(): void {
    if (!this.selectedBatch) return;
    this.svc.calculateEvaluations(this.selectedBatch).subscribe({ next: () => { this.snack.open('Evaluations calculated', 'Close', { duration: 3000 }); this.loadEvaluations(); }, error: () => this.snack.open('Failed to calculate', 'Close', { duration: 3000 }) });
  }

  getScoreColor(score: number): string { if (score >= 80) return 'score-high'; if (score >= 60) return 'score-mid'; return 'score-low'; }
}
