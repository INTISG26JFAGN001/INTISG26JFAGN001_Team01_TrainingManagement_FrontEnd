import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AssociateListComponent } from './associate-list/associate-list.component';
import { EnrollmentComponent } from './enrollment/enrollment.component';
import { AssociateFormComponent } from './associate-form/associate-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [AssociateListComponent, EnrollmentComponent, AssociateFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: AssociateListComponent, canActivate: [AuthGuard] }])]
})
export class AssociatesModule {}
