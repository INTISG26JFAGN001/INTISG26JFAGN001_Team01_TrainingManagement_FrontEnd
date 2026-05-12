import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BatchService } from '../../../core/services/batch.service';
import { TrainerService } from '../../../core/services/trainer.service';

@Component({
  selector: 'app-batch-form',
  template: `
    <h2 mat-dialog-title><mat-icon>groups</mat-icon> Create New Batch</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Batch Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Java Batch Q1 2026"/>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate"/>
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate"/>
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Capacity</mat-label>
            <input matInput type="number" formControlName="capacity"/>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Trainer</mat-label>
            <mat-select formControlName="trainerId">
              <mat-option *ngFor="let t of trainers" [value]="t.id">{{ t.fullName }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Creating...' : 'Create Batch' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form{display:flex;flex-direction:column;gap:4px;padding-top:8px;min-width:460px} h2[mat-dialog-title]{display:flex;align-items:center;gap:8px} .full-width{width:100%} .form-row{display:flex;gap:12px} .half-width{flex:1}`]
})
export class BatchFormComponent implements OnInit {
  form = this.fb.group({ name: ['', Validators.required], description: [''], startDate: [null, Validators.required], endDate: [null, Validators.required], capacity: [30, [Validators.required, Validators.min(1)]], trainerId: [null, Validators.required] });
  trainers: any[] = [];
  saving = false;

  constructor(private fb: FormBuilder, private svc: BatchService, private trainerSvc: TrainerService, private snack: MatSnackBar, public dialogRef: MatDialogRef<BatchFormComponent>) {}

  ngOnInit(): void { this.trainerSvc.getAll().subscribe(t => this.trainers = t); }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.svc.create(this.form.value as any).subscribe({ next: () => { this.snack.open('Batch created', 'Close', { duration: 3000 }); this.dialogRef.close(true); }, error: (e) => { this.snack.open(e.error?.message || 'Error', 'Close', { duration: 3000 }); this.saving = false; } });
  }
}
