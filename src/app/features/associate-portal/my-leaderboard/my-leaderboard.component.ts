import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AssociateService } from '../../../core/services/associate.service';
import { AuthService } from '../../../core/services/auth.service';

interface LeaderboardEntry {
  rank: number;
  associateId: number;
  fullName: string;
  email: string;
  xp: number;
  isCurrentUser: boolean;
}

@Component({
  selector: 'app-my-leaderboard',
  templateUrl: './my-leaderboard.component.html',
  styleUrls: ['./my-leaderboard.component.scss']
})
export class MyLeaderboardComponent implements OnInit {
  loading = true;
  batchId: number | null = null;
  currentAssociateId = 0;
  entries: LeaderboardEntry[] = [];
  displayedColumns = ['rank', 'name', 'xp'];

  constructor(
    private associateSvc: AssociateService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();

    this.associateSvc.getById(userId).pipe(
      catchError(() => of(null)),
      switchMap((me: any) => {
        if (!me) return of(null);
        this.currentAssociateId = me.id;

        // Direct batchId first, enrollment fallback
        const directBatchId: number | null = (me.batchId && me.batchId > 0) ? Number(me.batchId) : null;
        const batchId$ = directBatchId
          ? of(directBatchId)
          : this.associateSvc.getMyEnrollment(me.id).pipe(
              catchError(() => of(null)),
              switchMap((raw: any) => {
                const e = Array.isArray(raw) ? (raw[0] ?? null) : raw;
                const bid = e?.batchId ?? null;
                return of(bid && bid > 0 ? Number(bid) : null);
              })
            );

        return batchId$.pipe(
          switchMap((batchId: number | null) => {
            if (!batchId) return of(null);
            this.batchId = batchId;
            return this.associateSvc.getByBatch(batchId).pipe(catchError(() => of([])));
          })
        );
      })
    ).subscribe({
      next: (associates: any) => {
        if (!associates) { this.loading = false; return; }

        const unsorted: LeaderboardEntry[] = (associates as any[]).map((a: any) => ({
          rank: 0,
          associateId: a.id,
          fullName: a.fullName || a.email || `Associate #${a.id}`,
          email: a.email || '',
          xp: Number(a.xp ?? 0),
          isCurrentUser: a.id === this.currentAssociateId
        }));

        unsorted.sort((a, b) => b.xp - a.xp);
        this.entries = unsorted.map((e, i) => ({ ...e, rank: i + 1 }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getMedalIcon(rank: number): string {
    if (rank === 1) return 'emoji_events';
    if (rank === 2) return 'military_tech';
    if (rank === 3) return 'workspace_premium';
    return '';
  }

  getMedalClass(rank: number): string {
    if (rank === 1) return 'medal-gold';
    if (rank === 2) return 'medal-silver';
    if (rank === 3) return 'medal-bronze';
    return '';
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  }

  /** Width % for the XP bar, relative to the top scorer */
  getXpBarPct(xp: number): number {
    const max = this.entries[0]?.xp ?? 0;
    return max > 0 ? Math.round((xp / max) * 100) : 0;
  }
}
