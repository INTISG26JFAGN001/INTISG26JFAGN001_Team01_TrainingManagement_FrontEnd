import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TechnologiesComponent } from './technologies/technologies.component';
import { TechFormDialogComponent } from './technologies/tech-form-dialog.component';
import { CoursesComponent } from './courses/courses.component';
import { CourseFormDialogComponent } from './courses/course-form-dialog.component';
import { StagesComponent } from './stages/stages.component';
import { StageFormDialogComponent } from './stages/stage-form-dialog.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [TechnologiesComponent, TechFormDialogComponent, CoursesComponent, CourseFormDialogComponent, StagesComponent, StageFormDialogComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: 'technologies', component: TechnologiesComponent, canActivate: [AuthGuard] },
      { path: 'courses', component: CoursesComponent, canActivate: [AuthGuard] },
      { path: 'stages', component: StagesComponent, canActivate: [AuthGuard] },
      { path: '', redirectTo: 'technologies', pathMatch: 'full' }
    ])
  ]
})
export class CatalogModule {}
