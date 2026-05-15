import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { AuthService } from '../../../core/services/auth.service';
import { Batch, Interview } from '../../../core/models';

@Component({
  selector: 'app-interview-form',
  templateUrl: './interview-form.component.html',
  styleUrls: ['./interview-form.component.scss']
})
export class InterviewFormComponent implements OnInit {
  batches: Batch[] = [];
  saving = false;

  /**
   * Backend AssessmentStatus enum values (same as Quiz):
   *   DRAFT    – not yet visible to associates
   *   PUBLISHED – live, evaluations can be submitted
   *   CLOSED   – due date passed, no more evaluations
   *   ARCHIVED – soft-deleted / historical record
   */
  readonly statusOptions = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];

  /**
   * Creator identity — read from AuthService (localStorage).
   * The interceptor forwards X-User-Role so the backend can apply
   * role-specific logic.
   */
  creatorUsername = '';
  creatorRole = '';

  /** Only applied when CREATING — edit mode may have a past dueDate (CLOSED) */
  static futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const selected = new Date(control.value);
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    return selected > today ? null : { pastDate: true };
  }

  get isEditing(): boolean { return !!this.data; }

  /* ── Form group ──
     CREATE: all fields active
     EDIT  : batchId / interviewCategory are kept (so patchValue works)
             but validators are cleared — only title, dueDate, maxScore,
             status, scheduledDateTime, evaluatorRole are sent to the backend */
  form = this.fb.group({
    title:             ['', [Validators.required, Validators.maxLength(200)]],
    batchId:           [null as number | null, Validators.required],
    interviewCategory: ['INTERIM', Validators.required],
    dueDate:           ['' as string, [Validators.required, InterviewFormComponent.futureDateValidator]],
    scheduledDateTime: [null as string | null],
    evaluatorRole:     [''],
    maxScore:          [null as number | null, [Validators.min(1)]],
    status:            ['DRAFT']
  });

  constructor(
    private fb: FormBuilder,
    private svc: AssessmentService,
    private batchSvc: BatchService,
    private snack: MatSnackBar,
    private auth: AuthService,
    public dialogRef: MatDialogRef<InterviewFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Interview | null
  ) {}

  ngOnInit(): void {
    this.creatorUsername = this.auth.getUsername();
    this.creatorRole     = this.auth.getRole() ?? '';

    this.batchSvc.getAll().subscribe(b => this.batches = b);

    if (this.data) {
      /* ── EDIT MODE ── */

      // 1. Patch all fields (context + editable)
      this.form.patchValue({
        title:             this.data.title,
        dueDate:           this.data.dueDate ? String(this.data.dueDate).substring(0, 10) : '',
        maxScore:          this.data.maxScore ?? null,
        status:            this.data.status ?? 'DRAFT',
        batchId:           this.data.batchId,
        interviewCategory: this.data.interviewCategory ?? 'INTERIM',
        scheduledDateTime: this.data.scheduledDateTime
          ? String(this.data.scheduledDateTime).substring(0, 16)
          : null,
        evaluatorRole: this.data.evaluatorRole ?? ''
      });

      // 2. Remove future-date validator — dueDate may already be in the past for CLOSED interviews
      this.form.get('dueDate')?.setValidators([Validators.required]);
      this.form.get('dueDate')?.updateValueAndValidity();

      // 3. Clear validators on fields the backend ignores on PATCH
      this.form.get('batchId')?.clearValidators();
      this.form.get('batchId')?.updateValueAndValidity();
      this.form.get('interviewCategory')?.clearValidators();
      this.form.get('interviewCategory')?.updateValueAndValidity();

    } else {
      /* ── CREATE MODE — form already initialised with defaults ── */
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;

    if (this.data) {
      /* ── UPDATE ──
         PATCH /assessments/{id}
         Accepted fields: title, dueDate, maxScore, status
         + interview-specific optional: scheduledDateTime, evaluatorRole   */
      const payload: Record<string, any> = { title: v.title, status: v.status };
      if (v.dueDate)           payload['dueDate']           = v.dueDate;
      if (v.maxScore)          payload['maxScore']          = v.maxScore;
      if (v.scheduledDateTime) payload['scheduledDateTime'] = v.scheduledDateTime;
      if (v.evaluatorRole)     payload['evaluatorRole']     = v.evaluatorRole;

      this.svc.update(this.data.id, payload as any).subscribe({
        next: () => {
          this.snack.open('Interview updated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: e => {
          this.snack.open(e.error?.message || 'Failed to update interview', 'Close', { duration: 4000 });
          this.saving = false;
        }
      });

    } else {
      /* ── CREATE ──
         POST /assessments/interview → CreateInterviewRequest
         Required: title, batchId, interviewCategory
         Optional: dueDate, scheduledDateTime, evaluatorRole, maxScore, status */
      const payload: any = {
        title:             v.title,
        batchId:           v.batchId,
        interviewCategory: v.interviewCategory,
        dueDate:           v.dueDate,
        status:            v.status || 'DRAFT'
      };
      if (v.scheduledDateTime) payload.scheduledDateTime = v.scheduledDateTime;
      if (v.evaluatorRole)     payload.evaluatorRole     = v.evaluatorRole;
      if (v.maxScore)          payload.maxScore          = v.maxScore;

      this.svc.createInterview(payload).subscribe({
        next: () => {
          this.snack.open('Interview created. Add rubrics before publishing.', 'Close', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: e => {
          this.snack.open(e.error?.message || 'Failed to create interview', 'Close', { duration: 4000 });
          this.saving = false;
        }
      });
    }
  }

  get batchLabel(): string {
    const b = this.batches.find(b => b.id === this.data?.batchId);
    return b ? `#${b.id} — ${b.courseNames?.join(', ') || 'No course'}` : `#${this.data?.batchId}`;
  }

  get roleLabel(): string {
    const map: Record<string, string> = {
      ROLE_ADMIN:    'Admin',
      ROLE_TRAINER:  'Trainer',
      ROLE_TECH_LEAD:'Tech Lead'
    };
    return map[this.creatorRole] ?? this.creatorRole;
  }

  get categoryLabel(): string {
    const map: Record<string, string> = { INTERIM: 'Interim', FINAL: 'Final' };
    return map[this.data?.interviewCategory ?? ''] ?? '—';
  }
}
