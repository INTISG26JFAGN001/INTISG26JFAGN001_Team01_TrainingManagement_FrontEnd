import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { Associate, Batch, Enrollment, EnrollmentStatus } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-enrollments-page',
  templateUrl: './enrollments-page.component.html',
  styleUrls: ['./enrollments-page.component.scss']
})
export class EnrollmentsPageComponent implements OnInit {
  displayedColumns = ['associate', 'batch', 'status', 'joinDate', 'actions'];
  dataSource = new MatTableDataSource<Enrollment>();
  associates: Associate[] = [];
  batches: Batch[] = [];
  loading = true;
  showForm = false;
  saving = false;
  isAdmin = this.auth.isAdmin();
  canManage = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');

  statusOptions: EnrollmentStatus[] = ['PENDING', 'ACTIVE', 'COMPLETED', 'DROPPED'];

  form = this.fb.group({
    associateId: [null as number | null, Validators.required],
    batchId:     [null as number | null, Validators.required],
    status:      ['PENDING' as EnrollmentStatus, Validators.required]
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private svc: AssociateService,
    private batchSvc: BatchService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    forkJoin({ associates: this.svc.getAll(), batches: this.batchSvc.getAll() }).subscribe({
      next: ({ associates, batches }) => {
        this.associates = associates;
        this.batches = batches;
        this.loadEnrollments();
      },
      error: () => { this.snack.open('Failed to load data', 'Close', { duration: 3000 }); this.loading = false; }
    });
  }

  loadEnrollments(): void {
    this.loading = true;
    this.svc.getAllEnrollments().subscribe({
      next: d => {
        this.dataSource.data = d;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => { this.snack.open('Failed to load enrollments', 'Close', { duration: 3000 }); this.loading = false; }
    });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openForm(): void { this.showForm = true; this.form.reset({ status: 'PENDING' }); }
  closeForm(): void { this.showForm = false; }

  enroll(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const val = this.form.value;
    this.svc.createEnrollment({ associateId: val.associateId!, batchId: val.batchId!, status: val.status! }).subscribe({
      next: () => {
        this.snack.open('Associate enrolled successfully', 'Close', { duration: 3000 });
        this.closeForm();
        this.loadEnrollments();
        this.saving = false;
      },
      error: (e) => {
        this.snack.open(e.error?.message || 'Enrollment failed', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  updateStatus(enrollment: Enrollment, status: EnrollmentStatus): void {
    const id = enrollment.enrollmentId ?? enrollment.id;
    if (!id) return;
    this.svc.updateEnrollmentStatus(id, status).subscribe({
      next: () => { this.snack.open('Status updated', 'Close', { duration: 3000 }); this.loadEnrollments(); },
      error: () => this.snack.open('Failed to update status', 'Close', { duration: 3000 })
    });
  }

  delete(enrollment: Enrollment): void {
    const id = enrollment.enrollmentId ?? enrollment.id;
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Remove Enrollment', message: 'Remove this enrollment?', danger: true, confirmText: 'Remove' }
    }).afterClosed().subscribe(c => {
      if (c && id) this.svc.deleteEnrollment(id).subscribe({
        next: () => { this.snack.open('Enrollment removed', 'Close', { duration: 3000 }); this.loadEnrollments(); },
        error: () => this.snack.open('Failed to remove', 'Close', { duration: 3000 })
      });
    });
  }

  getAssociateName(id: number): string {
    const a = this.associates.find(a => a.id === id);
    return a ? (a.fullName || ('User #' + a.userId)) : ('Associate #' + id);
  }

  getBatchLabel(id: number): string {
    const b = this.batches.find(b => b.id === id);
    return b ? (b.courseNames?.join(', ') || ('Batch #' + id)) : ('Batch #' + id);
  }

  getStatusClass(s: string): string {
    return { ACTIVE: 'status-active', PENDING: 'status-pending', COMPLETED: 'status-completed', DROPPED: 'status-dropped' }[s] ?? '';
  }
}
