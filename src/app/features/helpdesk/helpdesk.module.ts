import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { HelpdeskComponent } from './helpdesk.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [HelpdeskComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: '', component: HelpdeskComponent, canActivate: [AuthGuard] }
    ])
  ]
})
export class HelpdeskModule {}
