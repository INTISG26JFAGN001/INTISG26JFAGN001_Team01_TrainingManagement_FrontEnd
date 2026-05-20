import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
import { AuthService } from '../../../core/services/auth.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { Batch, Quiz } from '../../../core/models';

@Component({
  selector: 'app-quiz-form',
  templateUrl: './quiz-form.component.html',
  styleUrls: ['./quiz-form.component.scss']
})
export class QuizFormComponent implements OnInit {
  batches: Batch[] = [];
  saving = false;
  readonly answerOptions: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

  /**
   * Backend AssessmentStatus enum values:
   *   DRAFT    – not yet visible to associates
   *   PUBLISHED – live, associates can attempt
   *   CLOSED   – due date passed, no more submissions
   *   ARCHIVED – soft-deleted / historical record
   */
  readonly statusOptions = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];

  /**
   * Creator identity — read from AuthService which stores these in localStorage
   * during login (POST /auth/login → GET /user/username):
   *   tms_username  ← user.username
   *   tms_role      ← user.roles[0]  (e.g. 'ROLE_ADMIN')
   * The interceptor also forwards X-User-Role so the backend can skip
   * trainer validation for ROLE_ADMIN.
   */
  creatorUsername = '';
  creatorRole = '';
  trainerId: number | null = null;

  /** Only applies when CREATING — backend UpdateAssessmentRequest has no @Future */
  static futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const selected = new Date(control.value);
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    return selected > today ? null : { pastDate: true };
  }

  get isEditing(): boolean { return !!this.data; }

  /* ── Form group ──
     CREATE: all fields active
     EDIT  : batchId/durationMinutes/passingMarks/questions are kept in the
             group (so patchValue works cleanly) but are disabled and excluded
             from the payload — the backend PATCH /assessments/{id} only
             accepts: title, dueDate, maxScore, status               */
  form = this.fb.group({
    title:          ['', [Validators.required, Validators.maxLength(200)]],
    batchId:        [null as number | null, Validators.required],
    durationMinutes:[null as number | null, [Validators.min(1)]],
    passingMarks:   [null as number | null, [Validators.required, Validators.min(1)]],
    dueDate:        [null as string | null, [Validators.required, QuizFormComponent.futureDateValidator]],
    maxScore:       [null as number | null, [Validators.min(1)]],
    status:         ['DRAFT'],
    questions:      this.fb.array([this.newQuestion()])
  });

  get questions(): FormArray { return this.form.get('questions') as FormArray; }

  newQuestion(): FormGroup {
    return this.fb.group({
      questionText:  ['', Validators.required],
      optionA:       ['', Validators.required],
      optionB:       ['', Validators.required],
      optionC:       ['', Validators.required],
      optionD:       ['', Validators.required],
      correctOption: ['A', Validators.required],
      marks:         [1, [Validators.required, Validators.min(1)]]
    });
  }

  addQuestion(): void { this.questions.push(this.newQuestion()); }

  removeQuestion(i: number): void {
    if (this.questions.length > 1) this.questions.removeAt(i);
  }

  constructor(
    private fb: FormBuilder,
    private svc: AssessmentService,
    private batchSvc: BatchService,
    private trainerSvc: TrainerService,
    private snack: MatSnackBar,
    private auth: AuthService,
    public dialogRef: MatDialogRef<QuizFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Quiz | null
  ) {}

  ngOnInit(): void {
    this.creatorUsername = this.auth.getUsername();
    this.creatorRole     = this.auth.getRole() ?? '';

    this.batchSvc.getAll().subscribe(b => this.batches = b);

    if (this.auth.isTrainer()) {
      const userId = this.auth.getUserId();
      this.trainerSvc.getAll().subscribe(trainers => {
        const match = trainers.find(t => t.userId === userId);
        this.trainerId = match?.trainerId ?? match?.id ?? null;
      });
    }

    if (this.data) {
      /* ── EDIT MODE ──
         The list opens this dialog after fetching the full QuizDetailResponse
         (GET /assessments/quiz/{id}), so all fields are populated.
         UpdateAssessmentRequest only accepts: title, dueDate, maxScore, status.
         No @Future validator on dueDate in edit mode.                     */

      // 1. Patch all editable + context fields
      this.form.patchValue({
        title:          this.data.title,
        dueDate:        this.data.dueDate ? String(this.data.dueDate).substring(0, 10) : null,
        maxScore:       this.data.maxScore ?? null,
        status:         this.data.status ?? 'DRAFT',
        batchId:        this.data.batchId,
        durationMinutes:this.data.durationMinutes ?? null,
        passingMarks:   this.data.passingMarks ?? null
      });

      // 2. Remove future-date validator — dueDate may already be in the past for CLOSED quizzes
      this.form.get('dueDate')?.setValidators([Validators.required]);
      this.form.get('dueDate')?.updateValueAndValidity();

      // 3. Clear validators on fields the backend ignores on update
      //    (batchId, passingMarks) — they are shown read-only, not submitted
      this.form.get('batchId')?.clearValidators();
      this.form.get('batchId')?.updateValueAndValidity();
      this.form.get('passingMarks')?.clearValidators();
      this.form.get('passingMarks')?.updateValueAndValidity();

      // 4. Clear the questions FormArray — questions are not updatable via PATCH
      //    /assessments/{id}. Leaving the default blank question would make the
      //    form permanently invalid since questionText/options have Validators.required.
      while (this.questions.length > 0) {
        this.questions.removeAt(0);
      }
      this.questions.clearValidators();
      this.questions.updateValueAndValidity();

    } else {
      /* ── CREATE MODE — form initialised with one blank question already ── */
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;

    if (this.data) {
      /* ── UPDATE ──
         Backend PATCH /assessments/{id} → UpdateAssessmentRequest
         Accepted fields: title, dueDate, maxScore, status (all optional)  */
      const payload: Record<string, any> = { title: v.title, status: v.status };
      if (v.dueDate)  payload['dueDate']   = v.dueDate;
      if (v.maxScore) payload['maxScore']  = v.maxScore;

      this.svc.update(this.data.id, payload as any).subscribe({
        next: () => {
          this.snack.open('Quiz updated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: e => {
          this.snack.open(e.error?.message || 'Failed to update quiz', 'Close', { duration: 4000 });
          this.saving = false;
        }
      });

    } else {
      /* ── CREATE ──
         Backend POST /assessments/quiz → CreateQuizRequest
         Required: title, batchId, questions
         Optional: durationMinutes, passingMarks, dueDate, status         */
      const payload: any = {
        title:        v.title,
        batchId:      v.batchId,
        passingMarks: v.passingMarks,
        dueDate:      v.dueDate,
        status:       v.status || 'DRAFT',
        questions:    v.questions
      };
      if (v.durationMinutes) payload.durationMinutes = v.durationMinutes;
      if (this.trainerId)    payload.trainerId = this.trainerId;

      this.svc.createQuiz(payload).subscribe({
        next: () => {
          this.snack.open('Quiz created successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: e => {
          this.snack.open(e.error?.message || 'Failed to create quiz', 'Close', { duration: 4000 });
          this.saving = false;
        }
      });
    }
  }

  get totalMarks(): number {
    return this.questions.controls.reduce((sum, q) => sum + (q.get('marks')?.value || 0), 0);
  }

  getOptionValue(questionGroup: any, opt: string): string {
    return questionGroup.get('option' + opt)?.value || 'Option ' + opt;
  }

  get batchLabel(): string {
    const b = this.batches.find(b => b.id === this.data?.batchId);
    return b ? `#${b.id} — ${b.courseNames?.join(', ') || 'No course'}` : `#${this.data?.batchId}`;
  }

  get roleLabel(): string {
    const map: Record<string, string> = { ROLE_ADMIN: 'Admin', ROLE_TRAINER: 'Trainer' };
    return map[this.creatorRole] ?? this.creatorRole;
  }
}
