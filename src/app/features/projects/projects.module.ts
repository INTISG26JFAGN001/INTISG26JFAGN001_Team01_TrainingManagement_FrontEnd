import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ProjectListComponent } from './project-list/project-list.component';
import { ProjectFormComponent } from './project-form/project-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [ProjectListComponent, ProjectFormComponent],
  imports: [SharedModule, RouterModule.forChild([{ path: '', component: ProjectListComponent, canActivate: [AuthGuard] }])]
})
export class ProjectsModule {}
