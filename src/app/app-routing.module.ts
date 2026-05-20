import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

const ADMIN_ONLY = ['ROLE_ADMIN'];
const ADMIN_LEAD = ['ROLE_ADMIN', 'ROLE_TECH_LEAD'];
const STAFF = ['ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_COACH', 'ROLE_TECH_LEAD', 'ROLE_SCRUM_LEAD'];
const ASSOCIATE_ONLY = ['ROLE_ASSOCIATE'];

const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  { path: 'landing', loadChildren: () => import('./features/landing/landing.module').then(m => m.LandingModule) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule) },
  { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule), canActivate: [AuthGuard] },
  { path: 'users', loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule), canActivate: [AuthGuard, RoleGuard], data: { roles: ADMIN_ONLY } },
  { path: 'batches', loadChildren: () => import('./features/batches/batches.module').then(m => m.BatchesModule), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF } },
  { path: 'associates', loadChildren: () => import('./features/associates/associates.module').then(m => m.AssociatesModule), canActivate: [AuthGuard] },
  { path: 'trainers', loadChildren: () => import('./features/trainers/trainers.module').then(m => m.TrainersModule), canActivate: [AuthGuard, RoleGuard], data: { roles: ADMIN_LEAD } },
  { path: 'catalog', loadChildren: () => import('./features/catalog/catalog.module').then(m => m.CatalogModule), canActivate: [AuthGuard, RoleGuard], data: { roles: ADMIN_LEAD } },
  { path: 'assessments', loadChildren: () => import('./features/assessments/assessments.module').then(m => m.AssessmentsModule), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF } },
  { path: 'projects', loadChildren: () => import('./features/projects/projects.module').then(m => m.ProjectsModule), canActivate: [AuthGuard] },
  { path: 'evaluations', loadChildren: () => import('./features/evaluations/evaluations.module').then(m => m.EvaluationsModule), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF } },
  { path: 'schedules', loadChildren: () => import('./features/schedules/schedules.module').then(m => m.SchedulesModule), canActivate: [AuthGuard] },
  { path: 'enrollments', loadChildren: () => import('./features/enrollments/enrollments.module').then(m => m.EnrollmentsModule), canActivate: [AuthGuard, RoleGuard], data: { roles: STAFF } },
  { path: 'my-portal', loadChildren: () => import('./features/associate-portal/associate-portal.module').then(m => m.AssociatePortalModule), canActivate: [AuthGuard, RoleGuard], data: { roles: ASSOCIATE_ONLY } },
  { path: 'helpdesk', loadChildren: () => import('./features/helpdesk/helpdesk.module').then(m => m.HelpdeskModule), canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
