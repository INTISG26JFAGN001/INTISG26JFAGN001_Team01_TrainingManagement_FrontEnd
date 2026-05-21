import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { AssociateService } from '../../../core/services/associate.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-projects',
  templateUrl: './my-projects.component.html',
  styleUrls: ['./my-projects.component.scss']
})
export class MyProjectsComponent implements OnInit {
  loading = true;
  submitting = false;
  showForm = false;

  projects: any[] = [];
  batchId: number | null = null;
  associateId = 0;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private projectSvc: ProjectService,
    private associateSvc: AssociateService,
    private auth: AuthService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      title:   ['', [Validators.required, Validators.minLength(3)]],
      repoUrl: ['', [Validators.required, Validators.pattern('https?://.+')]]
    });
  }

  ngOnInit(): void { this.loadData(); }

  private loadData(): void {
    this.loading = true;
    const userId = this.auth.getUserId();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of({ projects: [], batchId: null, associateId: 0 });
        this.associateId = me.id;

        // Direct batchId first, enrollment fallback
        const directBatchId: number | null = (me.batchId && me.batchId > 0) ? Number(me.batchId) : null;
        const batchId$ = directBatchId
          ? of(directBatchId)
          : this.associateSvc.getMyEnrollment(me.id).pipe(
              catchError(() => of(null)),
              switchMap((raw: any) => {
                const enrollment = Array.isArray(raw) ? (raw[0] ?? null) : raw;
                const bid: number | null = enrollment?.batchId ?? null;
                return of(bid && bid > 0 ? Number(bid) : null);
              })
            );

        return batchId$.pipe(
          switchMap((batchId: number | null) => {
            return this.projectSvc.getProjectsByAssociate(me.id).pipe(
              catchError(() => of([])),
              switchMap((projects: any[]) => of({ projects, batchId, associateId: me.id }))
            );
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        this.batchId     = res.batchId;
        this.associateId = res.associateId;
        this.projects    = res.projects;
        this.loading     = false;
      },
      error: () => { this.loading = false; }
    });
  }

  submitProject(): void {
    if (this.form.invalid || !this.batchId) return;
    this.submitting = true;
    const payload = { ...this.form.value, batchId: this.batchId, associateId: this.associateId };
    this.projectSvc.submitProject(payload).subscribe({
      next: () => {
        this.snack.open('Project submitted successfully!', 'Close', { duration: 3000 });
        this.form.reset();
        this.showForm = false;
        this.submitting = false;
        this.loadData();
      },
      error: (e) => {
        this.snack.open(e.error?.message || 'Submission failed. Please try again.', 'Close', { duration: 4000 });
        this.submitting = false;
      }
    });
  }

  cancelForm(): void {
    this.form.reset();
    this.showForm = false;
  }
}
