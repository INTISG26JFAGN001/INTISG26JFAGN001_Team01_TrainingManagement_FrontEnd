import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { UserService } from '../../../core/services/user.service';
import { Associate, Batch, Enrollment, EnrollmentStatus, User } from '../../../core/models';
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
  loading = true;
  showForm = false;
  saving = false;
  isAdmin = this.auth.isAdmin();
  canManage = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');

  statusOptions: EnrollmentStatus[] = ['ENROLLED', 'ACTIVE', 'COMPLETED'];

  form = this.fb.group({
    associateId: [null as number | null, Validators.required],
    batchId:     [null as number | null, Validators.required],
    status:      ['ENROLLED' as EnrollmentStatus, Validators.required]
  });

  // Autocomplete search controls (separate from form group)
  assocSearchCtrl = new FormControl('');
  batchSearchCtrl = new FormControl('');

  // Private data subjects
  private _associates$ = new BehaviorSubject<Associate[]>([]);
  private _batches$    = new BehaviorSubject<Batch[]>([]);

  // Flat arrays for table lookups
  private associates: Associate[] = [];
  private batches: Batch[] = [];

  // Filtered streams for autocomplete panels
  filteredAssociates$: Observable<Associate[]> = combineLatest([
    this._associates$,
    this.assocSearchCtrl.valueChanges.pipe(startWith(''))
  ]).pipe(
    map(([list, search]) => {
      const term = (typeof search === 'string' ? search : '').trim().toLowerCase();
      if (!term) return list;
      return list.filter(a =>
        (a.fullName || '').toLowerCase().includes(term) ||
        String(a.userId).includes(term)
      );
    })
  );

  filteredBatches$: Observable<Batch[]> = combineLatest([
    this._batches$,
    this.batchSearchCtrl.valueChanges.pipe(startWith(''))
  ]).pipe(
    map(([list, search]) => {
      const term = (typeof search === 'string' ? search : '').trim().toLowerCase();
      if (!term) return list;
      return list.filter(b =>
        String(b.id).includes(term) ||
        (b.courseNames?.join(' ') || '').toLowerCase().includes(term) ||
        (b.status || '').toLowerCase().includes(term)
      );
    })
  );

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(
    private fb: FormBuilder,
    private svc: AssociateService,
    private batchSvc: BatchService,
    private userSvc: UserService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // Clear form IDs when user types (instead of selecting) so stale IDs aren't submitted
    this.assocSearchCtrl.valueChanges.subscribe(v => {
      if (typeof v === 'string') this.form.patchValue({ associateId: null });
    });
    this.batchSearchCtrl.valueChanges.subscribe(v => {
      if (typeof v === 'string') this.form.patchValue({ batchId: null });
    });

    forkJoin({
      associates: this.svc.getAll(),
      batches:    this.batchSvc.getAll(),
      users:      this.userSvc.getAll().pipe(catchError(() => of([] as User[])))
    }).subscribe({
      next: ({ associates, batches, users }) => {
        // Enrich associates with real names from user service
        const userMap = new Map<number, User>(users.map(u => [u.id, u]));
        const enriched: Associate[] = associates.map(a => {
          const u = userMap.get(a.userId);
          return u ? { ...a, fullName: u.fullName || u.username, email: u.email } : a;
        });

        this.associates = enriched;
        this.batches    = batches;
        this._associates$.next(enriched);
        this._batches$.next(batches);
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

        this.loading = false;
      },
      error: () => { this.snack.open('Failed to load enrollments', 'Close', { duration: 3000 }); this.loading = false; }
    });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openForm(): void {
    this.showForm = true;
    this.form.reset({ status: 'ENROLLED' });
    this.assocSearchCtrl.setValue('');
    this.batchSearchCtrl.setValue('');
  }

  closeForm(): void { this.showForm = false; }

  /** Called when user picks an associate from the autocomplete panel */
  onAssocSelected(a: Associate): void {
    this.form.patchValue({ associateId: a.id });
  }

  /** Called when user picks a batch from the autocomplete panel */
  onBatchSelected(b: Batch): void {
    this.form.patchValue({ batchId: b.id });
  }

  /** displayWith function for associate autocomplete */
  displayAssoc = (val: Associate | string | null): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.fullName || ('User #' + val.userId);
  };

  /** displayWith function for batch autocomplete */
  displayBatch = (val: Batch | string | null): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return '#' + val.id + (val.courseNames?.length ? ' — ' + val.courseNames.join(', ') : '');
  };

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

  /** Resolve associate display name for the enrollment table rows */
  getAssociateName(id: number): string {
    const a = this.associates.find(x => x.id === id);
    return a ? (a.fullName || ('User #' + a.userId)) : ('Associate #' + id);
  }

  /** Resolve batch label (#ID — courses) for the enrollment table rows */
  getBatchLabel(id: number): string {
    const b = this.batches.find(x => x.id === id);
    if (!b) return 'Batch #' + id;
    return '#' + b.id + (b.courseNames?.length ? ' — ' + b.courseNames.join(', ') : '');
  }

  getStatusClass(s: string): string {
    return ({ ENROLLED: 'status-enrolled', ACTIVE: 'status-active', COMPLETED: 'status-completed' } as Record<string,string>)[s] ?? '';
  }
}
