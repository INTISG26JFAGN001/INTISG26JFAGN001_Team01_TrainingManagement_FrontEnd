import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem { label: string; icon: string; route?: string; children?: NavItem[]; roles?: string[]; expanded?: boolean; }

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Output() closeSidenav = new EventEmitter<void>();

  role = this.auth.getRole() ?? '';
  username = this.auth.getUsername();

  private ADMIN = ['ROLE_ADMIN'];
  private ADMIN_LEAD = ['ROLE_ADMIN', 'ROLE_TECH_LEAD'];
  private STAFF = ['ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_COACH', 'ROLE_TECH_LEAD', 'ROLE_SCRUM_LEAD'];
  private ALL = ['ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_ASSOCIATE', 'ROLE_COACH', 'ROLE_TECH_LEAD', 'ROLE_SCRUM_LEAD'];

  private ASSOCIATE = ['ROLE_ASSOCIATE'];

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: this.ALL },
    { label: 'Users', icon: 'manage_accounts', route: '/users', roles: this.ADMIN },
    {
      label: 'Training', icon: 'school', expanded: false, roles: this.STAFF,
      children: [
        { label: 'Batches', icon: 'groups', route: '/batches', roles: this.STAFF },
        { label: 'Associates', icon: 'person', route: '/associates', roles: this.STAFF },
        { label: 'Trainers', icon: 'supervisor_account', route: '/trainers', roles: this.ADMIN_LEAD },
        { label: 'Schedules', icon: 'calendar_today', route: '/schedules', roles: this.STAFF },
        { label: 'Enrollments', icon: 'assignment_turned_in', route: '/enrollments', roles: this.STAFF },
      ]
    },
    {
      label: 'Catalog', icon: 'menu_book', expanded: false, roles: this.ADMIN_LEAD,
      children: [
        { label: 'Technologies', icon: 'code', route: '/catalog/technologies', roles: this.ADMIN_LEAD },
        { label: 'Courses', icon: 'import_contacts', route: '/catalog/courses', roles: this.ADMIN_LEAD },
        { label: 'Stages', icon: 'layers', route: '/catalog/stages', roles: this.ADMIN_LEAD },
      ]
    },
    { label: 'Assessments', icon: 'quiz', route: '/assessments', roles: this.STAFF },
    {
      label: 'Evaluations', icon: 'leaderboard', expanded: false, roles: this.STAFF,
      children: [
        { label: 'Interview',      icon: 'record_voice_over', route: '/evaluations/interview', roles: this.STAFF },
        { label: 'Project Review', icon: 'rate_review',       route: '/evaluations/project',   roles: this.STAFF },
      ]
    },
    // Associate-only section
    {
      label: 'My Learning', icon: 'school', expanded: false, roles: this.ASSOCIATE,
      children: [
        { label: 'My Quizzes',   icon: 'fact_check',        route: '/my-portal/quizzes',      roles: this.ASSOCIATE },
        { label: 'My Results',   icon: 'bar_chart',         route: '/my-portal/results',      roles: this.ASSOCIATE },
        { label: 'My Schedules', icon: 'calendar_month',    route: '/my-portal/schedules',    roles: this.ASSOCIATE },
        { label: 'My Projects',  icon: 'rocket_launch',     route: '/my-portal/projects',     roles: this.ASSOCIATE },
        { label: 'Leaderboard',  icon: 'emoji_events',      route: '/my-portal/leaderboard',  roles: this.ASSOCIATE },
        { label: 'My Profile',   icon: 'manage_accounts',   route: '/my-portal/profile',      roles: this.ASSOCIATE },
      ]
    },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  isVisible(item: NavItem): boolean {
    if (!item.roles) return true;
    return item.roles.includes(this.role);
  }

  toggleGroup(item: NavItem): void { item.expanded = !item.expanded; }

  navigate(route: string): void {
    this.router.navigate([route]);
    this.closeSidenav.emit();
  }

  isActive(route?: string): boolean {
    if (!route) return false;
    return this.router.url.startsWith(route);
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
