import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { ScheduleService } from '../../../core/services/schedule.service';
import { BatchService } from '../../../core/services/batch.service';
import { AssociateService } from '../../../core/services/associate.service';
import { Schedule, Batch } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ScheduleFormDialog } from './schedule-form-dialog.component';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

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

  displayedColumns = ['sessionDate', 'batch', 'actions'];

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(
    private svc: ScheduleService,
    private batchSvc: BatchService,
    private dialog: MatDialog,
    private associateSvc: AssociateService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isAssociate) {
      this.loadAssociateView();
    } else {
      this.loading = true;
      this.batchSvc.getAll().subscribe(b => {
        this.batches = b;
        this.loadAllSchedules();
      });
    }
  }

  private loadAssociateView(): void {
    const userId = this.auth.getUserId();
    this.loading = true;
    // GET /associates/{userId} queries by the userId column (not PK), so this is correct
    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {

        console.log('Associate profile:', me);
        console.log('me.batchId:', me?.batchId);

        if (!me) return of(null);

        // Use batchId directly if valid (> 0)
        const directBatchId: number | null = (me.batchId && me.batchId > 0) ? me.batchId : null;
       
         console.log('directBatchId resolved:', directBatchId);

        if (directBatchId) return of(directBatchId);

        // Fallback: look up via enrollment
        return this.associateSvc.getMyEnrollment(me.id).pipe(
          catchError(() => of(null)),
          map((raw: any) => {
            const enrollment = Array.isArray(raw) ? (raw[0] ?? null) : raw;
            const enrollBatchId: number | null =
              enrollment?.batchId ?? enrollment?.batch?.id ?? null;
            return (enrollBatchId && enrollBatchId > 0) ? enrollBatchId : null;
          })
        );
      })
    ).subscribe({
      next: (batchId: number | null) => {
        if (!batchId) { this.loading = false; return; }
        this.selectedBatchId = batchId;
        this.batchSvc.getById(batchId).pipe(catchError(() => of(null))).subscribe(b => {
          if (b) this.batches = [b];
          this.loadSchedules();
        });
      },
      error: () => { this.loading = false; }
    });
  }

  loadAllSchedules(): void {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: d => {
        this.dataSource.data = d.sort((a, b) =>
          new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
        );

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadSchedules(): void {
    if (!this.selectedBatchId) { this.loadAllSchedules(); return; }
    this.loading = true;
    this.svc.getByBatch(this.selectedBatchId).subscribe({
      next: d => {
        this.dataSource.data = d.sort((a, b) =>
          new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
        );

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onBatchChange(): void {
    if (this.selectedBatchId) {
      this.loadSchedules();
    } else {
      this.loadAllSchedules();
    }
  }

  addSchedule(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const { batchId, sessionDate } = this.form.value;
    console.log(batchId+" "+sessionDate);
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

  openForm(s:Schedule){
    console.log(s);
    this.dialog.open(ScheduleFormDialog,{
      width: '560px',
      data: s ?? null
    }).afterClosed().subscribe(
      conf=>{
        console.log(conf);
        if(conf){
          this.loadSchedules();
        }
      }
    );
  }
  deleteForm(s: Schedule): void {
    console.log(s);
      this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Delete Technology', message: `Delete session for Batch ${s.batchId} on ${s.sessionDate}?`, danger: true, confirmText: 'Delete' }
      }).afterClosed().subscribe(c => {
        console.log(c);
        console.log(s.scheduleId);
        if (c && s.scheduleId) 
          this.svc.deleteSchedule(s.scheduleId).subscribe({
            next: (res) => { console.log(res);this.snack.open('Schedule deleted', 'Close', { duration: 3000 }); this.loadSchedules(); },
            error: (res) => { console.log(res);this.snack.open('Failed to delete', 'Close', { duration: 3000 });}
          });
      });
    }
}
