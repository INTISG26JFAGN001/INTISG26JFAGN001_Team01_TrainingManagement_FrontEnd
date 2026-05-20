import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { BatchService } from '../../../core/services/batch.service';
import { Project, Batch } from '../../../core/models';

@Component({
  selector: 'app-project-form-dialog',
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px">
      <mat-icon style="color:#34d399">work</mat-icon>
      {{ data ? 'Edit Project' : 'Add Project' }}
    </h2>

    <mat-dialog-content style="min-width:500px;padding:8px 24px 4px">
      <!-- Edit context row -->
      <div *ngIf="data" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 14px;background:var(--bg-input);border-radius:8px;border:1px solid var(--border)">
        <mat-icon style="font-size:16px;color:var(--text-secondary)">work</mat-icon>
        <span style="font-size:12px;color:var(--text-secondary)">Editing project</span>
        <span class="id-chip">#{{ data.id }}</span>
        <span style="font-size:13px;font-weight:600;color:var(--text-primary)">{{ data.title }}</span>
      </div>

      <form [formGroup]="form">
        <!-- Title -->
        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px">
          <mat-label>Project Title</mat-label>
          <input matInput formControlName="title" placeholder="e.g. E-Commerce Platform" />
          <mat-error *ngIf="form.get('title')?.hasError('required')">Title is required</mat-error>
        </mat-form-field>

        <!-- Batch -->
        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px">
          <mat-label>Batch</mat-label>
          <mat-select formControlName="batchId">
            <mat-option *ngFor="let b of batches" [value]="b.id">
              #{{ b.id }} — {{ b.courseNames?.join(', ') || 'No course' }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('batchId')?.hasError('required')">Batch is required</mat-error>
        </mat-form-field>

        <!-- Repository URL -->
        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px">
          <mat-label>Repository URL</mat-label>
          <mat-icon matPrefix style="font-size:18px;margin-right:4px">link</mat-icon>
          <input matInput formControlName="repoUrl" placeholder="https://github.com/org/repo" />
          <mat-error *ngIf="form.get('repoUrl')?.hasError('required')">Repository URL is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:12px 24px">
      <button mat-stroked-button mat-dialog-close [disabled]="saving">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        <mat-icon>{{ saving ? 'hourglass_empty' : (data ? 'save' : 'add') }}</mat-icon>
        {{ saving ? 'Saving…' : (data ? 'Save Changes' : 'Add Project') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .id-chip {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 700; font-family: monospace;
      background: rgba(0,198,255,0.08); color: var(--accent);
      border: 1px solid rgba(0,198,255,0.2);
    }
  `]
})
export class ProjectFormDialogComponent implements OnInit {
  form!: FormGroup;
  batches: Batch[] = [];
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: ProjectService,
    private batchSvc: BatchService,
    private snack: MatSnackBar,
    private ref: MatDialogRef<ProjectFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Project | null
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title:   [this.data?.title   ?? '', Validators.required],
      batchId: [this.data?.batchId ?? null, Validators.required],
      repoUrl: [this.data?.repoUrl ?? '', Validators.required]
    });

    this.batchSvc.getAll().subscribe(b => this.batches = b);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = this.form.value;

    const req$ = this.data
      ? this.svc.updateProject(this.data.id, payload)
      : this.svc.submitProject(payload);

    req$.subscribe({
      next: () => {
        this.snack.open(this.data ? 'Project updated' : 'Project added', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (e) => {
        this.snack.open(e.error?.message || 'Failed to save project', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
