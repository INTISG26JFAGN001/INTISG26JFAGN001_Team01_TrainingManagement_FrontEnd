import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ScheduleService } from '../../../core/services/schedule.service';
import { BatchService } from '../../../core/services/batch.service';
import { AssociateService } from '../../../core/services/associate.service';
import { Schedule, Batch } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-schedule-list',
  templateUrl: './schedule-list.component.html',
  styleUrls: ['./schedule-list.component.scss']
})
export class ScheduleListComponent implements OnInit {
  dataSource = new MatTableDataSource<Schedule>();
  batches: Batch[] = [];
  selectedBatchId: number | null = null;
  loading = false;
  saving = false;
  showForm = false;

  isAssociate = this.auth.isAssociate();
  canManage = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');

  form = this.fb.group({
    batchId: [null as number | null, Validators.required],
    sessionDate: ['', Validators.required]
  });

  displayedColumns = ['sessionDate', 'batch'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private svc: ScheduleService,
    private batchSvc: BatchService,
    private associateSvc: AssociateService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isAssociate) {
      this.loadAssociateView();
    } else {
      this.batchSvc.getAll().subscribe(b => { this.batches = b; });
    }
  }

  private loadAssociateView(): void {
    const userId = this.auth.getUserId();
    this.loading = true;
    this.associateSvc.getAll().pipe(
      switchMap(associates => {
        const me = associates.find(a => a.userId === userId);
        if (!me) return of(null);
        return this.associateSvc.getEnrollmentsByAssociate(me.id);
      })
    ).subscribe({
      next: enrollments => {
        if (!enrollments) { this.loading = false; return; }
        const active = enrollments.find(e => e.status === 'ACTIVE');
        if (active) {
          this.selectedBatchId = active.batchId;
          this.batchSvc.getAll().subscribe(b => {
            this.batches = b;
            this.loadSchedules();
          });
        } else {
          this.batchSvc.getAll().subscribe(b => { this.batches = b; this.loading = false; });
        }
      },
      error: () => {
        this.batchSvc.getAll().subscribe(b => { this.batches = b; this.loading = false; });
      }
    });
  }

  loadSchedules(): void {
    if (!this.selectedBatchId) return;
    this.loading = true;
    this.svc.getByBatch(this.selectedBatchId).subscribe({
      next: d => {
        this.dataSource.data = d.sort((a, b) =>
          new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
        );
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onBatchChange(): void {
    if (this.selectedBatchId) this.loadSchedules();
  }

  addSchedule(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const { batchId, sessionDate } = this.form.value;
    this.svc.create({ batchId: batchId!, sessionDate: sessionDate! }).subscribe({
      next: () => {
        this.snack.open('Session scheduled', 'Close', { duration: 3000 });
        this.saving = false;
        this.showForm = false;
        this.form.reset();
        this.selectedBatchId = batchId ?? null;
        this.loadSchedules();
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to add session', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  getBatchLabel(id: number): string {
    const b = this.batches.find(b => b.id === id);
    return b?.courseNames?.join(', ') || `Batch #${id}`;
  }

  isUpcoming(date: string): boolean { return new Date(date) >= new Date(); }
}
