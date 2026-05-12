import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TechnologiesComponent } from './technologies/technologies.component';
import { CoursesComponent } from './courses/courses.component';
import { StagesComponent } from './stages/stages.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [TechnologiesComponent, CoursesComponent, StagesComponent],
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
