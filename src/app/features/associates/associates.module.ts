import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AssociateListComponent } from './associate-list/associate-list.component';
import { EnrollmentComponent } from './enrollment/enrollment.component';
import { AssociateFormComponent } from './associate-form/associate-form.component';
import { AssociateEditFormComponent } from './associate-edit-form/associate-edit-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [AssociateListComponent, EnrollmentComponent, AssociateFormComponent, AssociateEditFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: AssociateListComponent, canActivate: [AuthGuard] }])]
})
export class AssociatesModule {}
