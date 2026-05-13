import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssessmentService } from '../../../core/services/assessment.service';
import { BatchService } from '../../../core/services/batch.service';
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
  readonly statusOptions = ['DRAFT', 'PUBLISHED'];

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    batchId: [null as number | null, Validators.required],
    durationMinutes: [null as number | null, [Validators.min(1)]],
    passingMarks: [null as number | null, [Validators.min(0)]],
    dueDate: [null as string | null],
    status: ['DRAFT'],
    questions: this.fb.array([this.newQuestion()])
  });

  get questions(): FormArray { return this.form.get('questions') as FormArray; }

  newQuestion(): FormGroup {
    return this.fb.group({
      questionText: ['', Validators.required],
      optionA: ['', Validators.required],
      optionB: ['', Validators.required],
      optionC: ['', Validators.required],
      optionD: ['', Validators.required],
      correctOption: ['A', Validators.required],
      marks: [1, [Validators.required, Validators.min(1)]]
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
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<QuizFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Quiz | null
  ) {}

  ngOnInit(): void {
    this.batchSvc.getAll().subscribe(b => this.batches = b);
    if (this.data) {
      this.form.patchValue({
        title: this.data.title,
        batchId: this.data.batchId,
        durationMinutes: this.data.durationMinutes ?? null,
        passingMarks: this.data.passingMarks ?? null,
        status: this.data.status ?? 'DRAFT'
      });
      if (this.data.questions?.length) {
        this.questions.clear();
        this.data.questions.forEach(q => {
          this.questions.push(this.fb.group({
            questionText: [q.questionText, Validators.required],
            optionA: [q.optionA, Validators.required],
            optionB: [q.optionB, Validators.required],
            optionC: [q.optionC, Validators.required],
            optionD: [q.optionD, Validators.required],
            correctOption: [q.correctOption ?? 'A', Validators.required],
            marks: [q.marks ?? 1, [Validators.required, Validators.min(1)]]
          }));
        });
      }
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;

    const payload: any = {
      title: v.title,
      batchId: v.batchId,
      status: v.status || 'DRAFT',
      questions: v.questions
    };
    if (v.durationMinutes) payload.durationMinutes = v.durationMinutes;
    if (v.passingMarks != null) payload.passingMarks = v.passingMarks;
    if (v.dueDate) payload.dueDate = v.dueDate;

    const action = this.data
      ? this.svc.update(this.data.id, payload)
      : this.svc.createQuiz(payload);

    action.subscribe({
      next: () => {
        this.snack.open(`Quiz ${this.data ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: e => {
        this.snack.open(e.error?.message || 'Failed to save quiz', 'Close', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  /** Sum of marks across all questions — shown in dialog footer */
  get totalMarks(): number {
    return this.questions.controls.reduce((sum, q) => sum + (q.get('marks')?.value || 0), 0);
  }

  getOptionValue(questionGroup: any, opt: string): string {
    return questionGroup.get('option' + opt)?.value || 'Option ' + opt;
  }
}
