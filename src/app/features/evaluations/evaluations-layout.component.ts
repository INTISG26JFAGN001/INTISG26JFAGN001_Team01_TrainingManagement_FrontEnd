import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-evaluations-layout',
  template: `
    <div class="assess-layout">
      <div class="assess-tabs">
        <div class="assess-tab"
             *ngFor="let tab of tabs"
             [class.active]="isActive(tab.route)"
             (click)="navigate(tab.route)">
          <mat-icon>{{ tab.icon }}</mat-icon>
          <span>{{ tab.label }}</span>
        </div>
      </div>
      <div class="assess-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .assess-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .assess-tabs {
      display: flex;
      gap: 12px;
      padding: 20px 24px 0;
      background: var(--bg-root);
      border-bottom: 1px solid var(--border);
    }

    .assess-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-bottom: none;
      transition: all 0.2s;
      position: relative;
      bottom: -1px;
    }

    .assess-tab mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .assess-tab:hover {
      color: var(--text-primary);
      background: var(--bg-card-hover);
    }

    .assess-tab.active {
      color: var(--accent);
      background: var(--bg-card);
      border-color: var(--border-active);
      border-bottom-color: var(--bg-card);
    }

    .assess-tab.active::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent-btn);
      border-radius: 8px 8px 0 0;
    }

    .assess-content {
      flex: 1;
      overflow: auto;
      padding: 24px;
      background: var(--bg-root);
    }
  `]
})
export class EvaluationsLayoutComponent {
  tabs = [
    { label: 'Interview',      icon: 'record_voice_over', route: '/evaluations/interview' },
    { label: 'Project Review', icon: 'rate_review',       route: '/evaluations/project' },
  ];

  activeRoute = '';

  constructor(private router: Router) {
    this.activeRoute = this.router.url;
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.activeRoute = e.urlAfterRedirects;
    });
  }

  isActive(route: string): boolean { return this.activeRoute.startsWith(route); }
  navigate(route: string): void { this.router.navigate([route]); }
}
