import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BatchService } from '../../core/services/batch.service';
import { AssociateService } from '../../core/services/associate.service';
import { TrainerService } from '../../core/services/trainer.service';
import { AssessmentService } from '../../core/services/assessment.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  loading = true;
  username = this.auth.getUsername();
  role = this.auth.getRole() ?? '';

  isAdmin = this.auth.isAdmin();
  isTrainer = this.auth.isTrainer();
  isAssociate = this.auth.isAssociate();
  isCoach = this.auth.isCoach();
  isTechLead = this.auth.isTechLead();
  isScrumLead = this.auth.isScrumLead();
  isStaff = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_COACH', 'ROLE_TECH_LEAD', 'ROLE_SCRUM_LEAD');

  // Admin / Tech Lead stats
  stats = { batches: 0, associates: 0, trainers: 0, assessments: 0, ongoing: 0, upcoming: 0, completed: 0 };

  // Trainer stats
  trainerStats = { myBatches: 0, myAssociates: 0, quizzes: 0, interviews: 0 };

  // Associate stats
  associateStats = { myBatch: '', batchStatus: '', upcomingSessions: 0, projectStatus: 'Not Submitted' };

  recentBatches: any[] = [];
  ongoingBatches: any[] = [];
  myBatches: any[] = [];       // trainer's batches
  upcomingSchedules: any[] = [];

  constructor(
    private batchSvc: BatchService,
    private associateSvc: AssociateService,
    private trainerSvc: TrainerService,
    private assessmentSvc: AssessmentService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isAdmin || this.isTechLead) {
      this.loadAdminDashboard();
    } else if (this.isTrainer) {
      this.loadTrainerDashboard();
    } else if (this.isAssociate) {
      this.loadAssociateDashboard();
    } else {
      this.loadStaffDashboard();
    }
  }

  private loadAdminDashboard(): void {
    forkJoin({
      batches: this.batchSvc.getAll(),
      associates: this.associateSvc.getAll(),
      trainers: this.trainerSvc.getAll(),
      assessments: this.assessmentSvc.getAll()
    }).subscribe({
      next: (res) => {
        this.stats.batches = res.batches.length;
        this.stats.associates = res.associates.length;
        this.stats.trainers = res.trainers.length;
        this.stats.assessments = res.assessments.length;
        this.stats.ongoing = res.batches.filter((b: any) => b.status === 'ONGOING').length;
        this.stats.upcoming = res.batches.filter((b: any) => b.status === 'UPCOMING').length;
        this.stats.completed = res.batches.filter((b: any) => b.status === 'COMPLETED').length;
        this.recentBatches = res.batches.slice(0, 5);
        this.ongoingBatches = res.batches.filter((b: any) => b.status === 'ONGOING').slice(0, 4);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadTrainerDashboard(): void {
    forkJoin({
      batches: this.batchSvc.getAll(),
      assessments: this.assessmentSvc.getAll()
    }).subscribe({
      next: (res) => {
        this.myBatches = res.batches.filter((b: any) => b.status === 'ONGOING' || b.status === 'UPCOMING');
        this.trainerStats.myBatches = this.myBatches.length;
        this.trainerStats.myAssociates = this.myBatches.reduce((sum: number, b: any) => sum + (b.associates?.length ?? 0), 0);
        this.trainerStats.quizzes = res.assessments.filter((a: any) => a.type === 'QUIZ').length;
        this.trainerStats.interviews = res.assessments.filter((a: any) => a.type !== 'QUIZ').length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadAssociateDashboard(): void {
    this.batchSvc.getAll().subscribe({
      next: (batches) => {
        const myBatch = batches.find((b: any) => b.status === 'ONGOING');
        if (myBatch) {
          this.associateStats.myBatch = myBatch.name;
          this.associateStats.batchStatus = myBatch.status;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadStaffDashboard(): void {
    forkJoin({
      batches: this.batchSvc.getAll(),
      assessments: this.assessmentSvc.getAll()
    }).subscribe({
      next: (res) => {
        this.stats.batches = res.batches.length;
        this.stats.ongoing = res.batches.filter((b: any) => b.status === 'ONGOING').length;
        this.stats.upcoming = res.batches.filter((b: any) => b.status === 'UPCOMING').length;
        this.stats.assessments = res.assessments.length;
        this.recentBatches = res.batches.slice(0, 5);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { ONGOING: 'status-ongoing', UPCOMING: 'status-upcoming', COMPLETED: 'status-completed', CANCELLED: 'status-cancelled' };
    return map[status] ?? '';
  }

  getRoleGreeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }

  getRoleLabel(): string {
    const map: Record<string, string> = {
      ROLE_ADMIN: 'Administrator', ROLE_TRAINER: 'Trainer',
      ROLE_ASSOCIATE: 'Associate', ROLE_COACH: 'Coach',
      ROLE_TECH_LEAD: 'Tech Lead', ROLE_SCRUM_LEAD: 'Scrum Lead'
    };
    return map[this.role] ?? this.role;
  }
}
