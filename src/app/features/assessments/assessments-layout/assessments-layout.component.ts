import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-assessments-layout',
  templateUrl: './assessments-layout.component.html',
  styleUrls: ['./assessments-layout.component.scss']
})
export class AssessmentsLayoutComponent {
  tabs = [
    { label: 'Quizzes',    icon: 'fact_check',        route: '/assessments/quizzes' },
    { label: 'Interviews', icon: 'record_voice_over',  route: '/assessments/interviews' },
    { label: 'Projects',   icon: 'work',               route: '/assessments/projects' },
  ];

  activeRoute = '';

  constructor(private router: Router) {
    this.activeRoute = this.router.url;
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.activeRoute = e.urlAfterRedirects;
    });
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  navigate(tab: { route: string }): void {
    this.router.navigate([tab.route]);
  }
}
