import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TrainerListComponent } from './trainer-list/trainer-list.component';
import { TrainerFormComponent } from './trainer-form/trainer-form.component';
import { TrainerEditFormComponent } from './trainer-edit-form/trainer-edit-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [TrainerListComponent, TrainerFormComponent, TrainerEditFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: TrainerListComponent, canActivate: [AuthGuard] }])]
})
export class TrainersModule {}
