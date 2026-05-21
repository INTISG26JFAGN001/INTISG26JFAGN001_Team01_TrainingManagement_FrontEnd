import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogService } from '../../../core/services/catalog.service';
import { Course, Technology } from '../../../core/models';

@Component({
  selector: 'app-course-form-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data ? 'edit' : 'add_circle' }}</mat-icon>
      {{ data ? 'Edit Course' : 'New Course' }}
    </h2>

    <mat-dialog-content>
      <!-- Context row shown when editing -->
      <div *ngIf="data" class="context-row">
        <span class="id-chip">#{{ data.id }}</span>
        <span class="context-name">{{ data.code }} — {{ data.title }}</span>
      </div>

      <form [formGroup]="form" class="dialog-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="field-code">
            <mat-label>Course Code</mat-label>
            <input matInput formControlName="code" placeholder="e.g. JAVA-101" />
            <mat-error>Code is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="field-title">
            <mat-label>Course Title</mat-label>
            <input matInput formControlName="title" placeholder="e.g. Java Fundamentals" />
            <mat-error>Title is required</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="field-tech">
            <mat-label>Technology</mat-label>
            <mat-select formControlName="technologyId">
              <mat-option *ngFor="let t of technologies" [value]="t.id" >{{ t.name }}</mat-option>
            </mat-select>
            <mat-error>Technology is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="field-duration">
            <mat-label>Duration (Days)</mat-label>
            <input matInput type="number" formControlName="durationDays" min="1" />
            <mat-error>Duration is required</mat-error>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving…' : (data ? 'Update' : 'Create') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .context-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .context-name { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
    .id-chip {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 700; font-family: monospace;
      background: rgba(0,198,255,0.08); color: var(--accent);
      border: 1px solid rgba(0,198,255,0.2);
    }
    .dialog-form { padding-top: 4px; }
    .form-row { display: flex; gap: 12px; }
    .field-code    { width: 140px; flex-shrink: 0; }
    .field-title   { flex: 1; min-width: 0; }
    .field-tech    { flex: 1; min-width: 0; }
    .field-duration { width: 140px; flex-shrink: 0; }
  `]
})
export class CourseFormDialogComponent implements OnInit {
  form = this.fb.group({
    code:         ['', Validators.required],
    title:        ['', Validators.required],
    technologyId: [null as number | null, Validators.required],
    durationDays: [30, Validators.required]
  });
  technologies: Technology[] = [];
  saving = false;

  constructor(
    private fb: FormBuilder,
    private svc: CatalogService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<CourseFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Course | null
  ) {}

  ngOnInit(): void {
    this.svc.getTechnologies().subscribe(t => {
      this.technologies = t;

      if (this.data) {
        const matched = t.find(tech => tech.name === this.data!.technologyName);

        this.form.patchValue({
          code:         this.data.code,
          title:        this.data.title,
          technologyId: matched?.id ?? null,
          durationDays: this.data.durationDays
        });
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = this.form.value as any;
    const action = this.data
      ? this.svc.updateCourse(this.data.id, payload)
      : this.svc.createCourse(payload);

    action.subscribe({
      next: () => {
        this.snack.open(`Course ${this.data ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.snack.open('Error saving course', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}
