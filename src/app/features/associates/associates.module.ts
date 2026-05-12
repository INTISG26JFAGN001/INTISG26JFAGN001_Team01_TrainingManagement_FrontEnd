import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AssociateListComponent } from './associate-list/associate-list.component';
import { EnrollmentComponent } from './enrollment/enrollment.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [AssociateListComponent, EnrollmentComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: AssociateListComponent, canActivate: [AuthGuard] }])]
})
export class AssociatesModule {}
