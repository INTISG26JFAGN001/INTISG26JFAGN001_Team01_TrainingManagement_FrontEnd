import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BatchService } from '../../../core/services/batch.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { BatchDetails, BatchStatus } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-batch-detail', templateUrl: './batch-detail.component.html', styleUrls: ['./batch-detail.component.scss'] })
export class BatchDetailComponent implements OnInit {
  batch!: BatchDetails;
  schedules: any[] = [];
  loading = true;
  isAdmin = this.auth.isAdmin();
  statuses: BatchStatus[] = ['UPCOMING', 'ACTIVE', 'COMPLETED'];
  selectedTab = 0;

  constructor(private route: ActivatedRoute, private svc: BatchService, private scheduleSvc: ScheduleService, private auth: AuthService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getDetails(id).subscribe({ next: d => { this.batch = d; this.loading = false; this.loadSchedules(id); }, error: () => this.loading = false });
  }

  loadSchedules(id: number): void { this.scheduleSvc.getByBatch(id).subscribe(s => this.schedules = s); }

  updateStatus(status: BatchStatus): void {
    this.svc.updateStatus(this.batch.id, status).subscribe({ next: (b) => { this.batch.status = b.status; this.snack.open('Status updated', 'Close', { duration: 3000 }); }, error: () => this.snack.open('Failed to update status', 'Close', { duration: 3000 }) });
  }

  getStatusClass(s: string): string {
    return { ACTIVE:'status-ongoing', UPCOMING:'status-upcoming', COMPLETED:'status-completed' }[s] ?? '';
  }
}
