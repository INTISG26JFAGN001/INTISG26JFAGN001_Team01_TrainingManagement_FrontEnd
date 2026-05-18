import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ScheduleService } from '../../../core/services/schedule.service';
import { AssociateService } from '../../../core/services/associate.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-schedules',
  templateUrl: './my-schedules.component.html',
  styleUrls: ['./my-schedules.component.scss']
})
export class MySchedulesComponent implements OnInit {
  loading = true;
  batchId: number | null = null;
  schedules: any[] = [];
  upcoming: any[] = [];
  past: any[] = [];
  today = new Date();

  constructor(
    private scheduleSvc: ScheduleService,
    private associateSvc: AssociateService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of([]);
        return this.associateSvc.getMyEnrollment(me.id).pipe(
          catchError(() => of(null)),
          switchMap((raw: any) => {
            const enrollment = Array.isArray(raw) ? (raw[0] ?? null) : raw;
            const batchId: number | null = enrollment?.batchId ?? me.batchId ?? me.currentBatchId ?? null;
            if (!batchId) return of([]);
            this.batchId = batchId;
            return this.scheduleSvc.getByBatch(batchId).pipe(catchError(() => of([])));
          })
        );
      })
    ).subscribe({
      next: (schedules: any[]) => {
        const sorted = [...schedules].sort(
          (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
        );
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        this.upcoming = sorted.filter(s => new Date(s.sessionDate) >= todayStart);
        this.past = sorted.filter(s => new Date(s.sessionDate) < todayStart);
        this.schedules = sorted;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  isToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const t = new Date();
    return d.getFullYear() === t.getFullYear()
      && d.getMonth() === t.getMonth()
      && d.getDate() === t.getDate();
  }
}
