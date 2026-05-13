import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { EnrollmentsPageComponent } from './enrollments-page/enrollments-page.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

@NgModule({
  declarations: [EnrollmentsPageComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: EnrollmentsPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD'] }
      }
    ])
  ]
})
export class EnrollmentsModule {}
