import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();
  username = this.auth.getUsername();
  role = this.auth.getRole() ?? '';
  isDark = true;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('theme');
    this.isDark = saved !== 'light';
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.isDark) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  getPageTitle(): string {
    const url = this.router.url;
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/users': 'User Management',
      '/batches': 'Batch Management',
      '/associates': 'Associates',
      '/trainers': 'Trainers',
      '/schedules': 'Schedules',
      '/enrollments': 'Enrollments',
      '/catalog/technologies': 'Technologies',
      '/catalog/courses': 'Courses',
      '/catalog/stages': 'Stages',
      '/assessments/quizzes': 'Quizzes',
      '/assessments/interviews': 'Interviews',
      '/projects': 'Projects',
      '/evaluations': 'Evaluations',
    };
    for (const key of Object.keys(map)) {
      if (url.startsWith(key)) return map[key];
    }
    return 'Training Management System';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  getRoleLabel(): string {
    const map: Record<string, string> = {
      ROLE_ADMIN: 'Admin', ROLE_TRAINER: 'Trainer',
      ROLE_ASSOCIATE: 'Associate', ROLE_COACH: 'Coach',
      ROLE_TECH_LEAD: 'Tech Lead', ROLE_SCRUM_LEAD: 'Scrum Lead'
    };
    return map[this.role] ?? this.role;
  }
}
