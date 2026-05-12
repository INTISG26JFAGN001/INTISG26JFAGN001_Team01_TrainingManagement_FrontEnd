import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-assessments-home',
  templateUrl: './assessments-home.component.html',
  styleUrls: ['./assessments-home.component.scss']
})
export class AssessmentsHomeComponent {
  canManage = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER');

  tiles = [
    {
      label: 'Quizzes',
      icon: 'fact_check',
      route: '/assessments/quizzes',
      desc: 'Create and manage quiz assessments',
      color: '#00c6ff',
      glow: 'rgba(0,198,255,0.12)'
    },
    {
      label: 'Interviews',
      icon: 'record_voice_over',
      route: '/assessments/interviews',
      desc: 'Schedule and track interview evaluations',
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.12)'
    },
    {
      label: 'Projects',
      icon: 'work',
      route: '/projects',
      desc: 'View and manage project submissions',
      color: '#34d399',
      glow: 'rgba(52,211,153,0.12)'
    },
    {
      label: 'Evaluation',
      icon: 'bar_chart',
      route: '/evaluations',
      desc: 'Calculate and review performance scores',
      color: '#fbbf24',
      glow: 'rgba(251,191,36,0.12)'
    }
  ];

  constructor(private router: Router, private auth: AuthService) {}

  go(route: string): void { this.router.navigate([route]); }
}
