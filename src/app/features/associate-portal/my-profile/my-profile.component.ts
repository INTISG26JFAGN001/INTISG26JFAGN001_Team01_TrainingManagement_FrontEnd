import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { BatchService } from '../../../core/services/batch.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss']
})
export class MyProfileComponent implements OnInit {
  loading = true;

  associate: any = null;
  enrollment: any = null;
  batch: any = null;

  constructor(
    private associateSvc: AssociateService,
    private batchSvc: BatchService,
    private userSvc: UserService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of({ associate: null, enrollment: null, batch: null });
        return this.userSvc.getById(userId).pipe(
          catchError(() => of(null)),
          switchMap((user: any) => {
            const associate = {
              ...me,
              fullName: me.fullName || user?.fullName || '',
              email: me.email || user?.email || ''
            };
            const batchId: number | null = me.batchId ?? me.currentBatchId ?? null;
            if (!batchId) return of({ associate, enrollment: null, batch: null });

            // Try enrollment lookup with me.id first, then fall back to userId
            const resolveEnrollment = (ids: number[]): any => {
              if (!ids.length) return of(null);
              const [head, ...tail] = ids;
              return this.associateSvc.getMyEnrollment(head).pipe(
                catchError(() => of(null)),
                switchMap((raw: any) => {
                  const found = Array.isArray(raw) ? (raw[0] ?? null) : raw;
                  if (found?.batchId) return of(found);
                  return resolveEnrollment(tail);
                })
              );
            };

            return forkJoin({
              enrollment: resolveEnrollment([me.id, userId, me.userId].filter(Boolean)),
              batch: this.batchSvc.getDetails(batchId).pipe(catchError(() => this.batchSvc.getById(batchId).pipe(catchError(() => of(null)))))
            }).pipe(
              switchMap(({ enrollment, batch }: any) => of({ associate, enrollment, batch }))
            );
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        this.associate = res.associate;
        this.enrollment = res.enrollment;
        this.batch = res.batch;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getExperienceLabel(level: string): string {
    const map: Record<string, string> = {
      FRESHER: 'Fresher', JUNIOR: 'Junior', MID: 'Mid-level', SENIOR: 'Senior'
    };
    return map[level] ?? level ?? '—';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-active', ENROLLED: 'chip-enrolled', COMPLETED: 'chip-completed'
    };
    return map[status] ?? '';
  }

  getBatchStatusColor(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-active', UPCOMING: 'chip-upcoming', COMPLETED: 'chip-completed'
    };
    return map[status] ?? '';
  }
}
