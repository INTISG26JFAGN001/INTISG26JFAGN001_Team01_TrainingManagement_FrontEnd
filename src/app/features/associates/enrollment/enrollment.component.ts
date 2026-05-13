import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { Associate, Enrollment } from '../../../core/models';

@Component({
  selector: 'app-enrollment',
  template: `
    <h2 mat-dialog-title><mat-icon>assignment_turned_in</mat-icon> Enroll: {{ data?.fullName }}</h2>
    <mat-dialog-content>
      <div class="enrollments-list" *ngIf="enrollments.length">
        <h4>Current Enrollments</h4>
        <div class="enrollment-item" *ngFor="let e of enrollments">
          <span class="batch-name">Batch #{{ e.batchId }}</span>
          <span class="status-chip" [ngClass]="getStatusClass(e.status)">{{ e.status }}</span>
          <button mat-icon-button color="warn" (click)="removeEnrollment((e.enrollmentId ?? e.id)!)" matTooltip="Remove"><mat-icon>remove_circle</mat-icon></button>
        </div>
      </div>
      <mat-divider *ngIf="enrollments.length"></mat-divider>
      <form [formGroup]="form" class="dialog-form" style="margin-top:12px">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Select Batch</mat-label>
          <mat-select formControlName="batchId">
            <mat-option *ngFor="let b of batches" [value]="b.id">{{ b.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Close</button>
      <button mat-flat-button color="primary" (click)="enroll()" [disabled]="form.invalid || saving">
        {{ saving ? 'Enrolling...' : 'Enroll' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form{min-width:420px}.full-width{width:100%}.enrollments-list{margin-bottom:12px}h4{font-size:13px;color:#546e7a;margin:0 0 8px}.enrollment-item{display:flex;align-items:center;gap:8px;padding:6px 0}.batch-name{flex:1;font-size:13px}.status-chip{padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}.status-chip.status-active{background:#e8f5e9;color:#2e7d32}.status-chip.status-completed{background:#e3f2fd;color:#1565c0}.status-chip.status-dropped{background:#ffebee;color:#c62828}`]
})
export class EnrollmentComponent implements OnInit {
  form = this.fb.group({ batchId: [null, Validators.required] });
  batches: any[] = [];
  enrollments: Enrollment[] = [];
  saving = false;

  constructor(private fb: FormBuilder, private svc: AssociateService, private batchSvc: BatchService, private snack: MatSnackBar, public dialogRef: MatDialogRef<EnrollmentComponent>, @Inject(MAT_DIALOG_DATA) public data: Associate) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe(b => this.batches = b);
    this.loadEnrollments();
  }

  loadEnrollments(): void { this.svc.getEnrollmentsByAssociate(this.data.id).subscribe(e => this.enrollments = e); }

  enroll(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.svc.createEnrollment({ associateId: this.data.id, batchId: this.form.value.batchId! }).subscribe({
      next: () => { this.snack.open('Enrolled successfully', 'Close', { duration: 3000 }); this.saving = false; this.form.reset(); this.loadEnrollments(); },
      error: (e) => { this.snack.open(e.error?.message || 'Error', 'Close', { duration: 3000 }); this.saving = false; }
    });
  }

  removeEnrollment(id: number): void { this.svc.deleteEnrollment(id).subscribe({ next: () => { this.snack.open('Removed', 'Close', { duration: 3000 }); this.loadEnrollments(); } }); }
  getStatusClass(s: string): string { return 'status-' + s?.toLowerCase(); }
}
