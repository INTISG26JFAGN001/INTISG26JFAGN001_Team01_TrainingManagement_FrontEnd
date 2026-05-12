import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { EvaluationListComponent } from './evaluation-list/evaluation-list.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [EvaluationListComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: EvaluationListComponent, canActivate: [AuthGuard] }])]
})
export class EvaluationsModule {}
