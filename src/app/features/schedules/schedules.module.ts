import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ScheduleListComponent } from './schedule-list/schedule-list.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [ScheduleListComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: '', component: ScheduleListComponent, canActivate: [AuthGuard] }
    ])
  ]
})
export class SchedulesModule {}
