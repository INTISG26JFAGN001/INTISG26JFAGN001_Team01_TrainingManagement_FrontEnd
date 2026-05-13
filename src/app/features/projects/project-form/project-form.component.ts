import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { BatchService } from '../../../core/services/batch.service';
import { Project } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-project-form',
  template: `
    <h2 mat-dialog-title><mat-icon>work</mat-icon> {{ data ? 'Edit' : 'Submit' }} Project</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width"><mat-label>Project Title</mat-label><input matInput formControlName="title"/></mat-form-field>
        <mat-form-field appearance="outline" class="full-width"><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="3"></textarea></mat-form-field>
        <mat-form-field appearance="outline" class="full-width"><mat-label>Batch</mat-label>
          <mat-select formControlName="batchId"><mat-option *ngFor="let b of batches" [value]="b.id">{{ b.courseNames?.join(', ') || ('Batch #' + b.id) }}</mat-option></mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width"><mat-label>Repository URL</mat-label><input matInput formControlName="repositoryUrl" placeholder="https://github.com/..."/></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">{{ saving ? 'Saving...' : (data ? 'Update' : 'Submit') }}</button>
    </mat-dialog-actions>
  `,
  styles: [`h2[mat-dialog-title]{display:flex;align-items:center;gap:8px}.dialog-form{display:flex;flex-direction:column;gap:4px;padding-top:8px;min-width:460px}.full-width{width:100%}`]
})
export class ProjectFormComponent implements OnInit {
  form = this.fb.group({ title: ['', Validators.required], description: [''], batchId: [null, Validators.required], repositoryUrl: [''] });
  batches: any[] = [];
  saving = false;

  constructor(private fb: FormBuilder, private svc: ProjectService, private batchSvc: BatchService, private auth: AuthService, private snack: MatSnackBar, public dialogRef: MatDialogRef<ProjectFormComponent>, @Inject(MAT_DIALOG_DATA) public data: Project) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe(b => this.batches = b);
    if (this.data) this.form.patchValue({ title: this.data.title, description: this.data.description, batchId: this.data.batchId as any, repositoryUrl: this.data.repositoryUrl });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = { ...this.form.value, associateId: this.auth.getUserId() };
    const action = this.data ? this.svc.updateProject(this.data.id, payload as any) : this.svc.submitProject(payload as any);
    action.subscribe({ next: () => { this.snack.open(`Project ${this.data ? 'updated' : 'submitted'}`, 'Close', { duration: 3000 }); this.dialogRef.close(true); }, error: (e) => { this.snack.open(e.error?.message || 'Error', 'Close', { duration: 3000 }); this.saving = false; } });
  }
}
