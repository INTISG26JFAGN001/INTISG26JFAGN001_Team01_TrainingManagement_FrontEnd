import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { EvaluationsLayoutComponent } from './evaluations-layout.component';
import { InterviewEvalComponent } from './interview-eval/interview-eval.component';
import { InterviewEvalDialogComponent } from './interview-eval/interview-eval-dialog.component';
import { ProjectReviewComponent } from './project-review/project-review.component';
import { ProjectReviewDialogComponent } from './project-review/project-review-dialog.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [
    EvaluationsLayoutComponent,
    InterviewEvalComponent,
    InterviewEvalDialogComponent,
    ProjectReviewComponent,
    ProjectReviewDialogComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: EvaluationsLayoutComponent,
        canActivate: [AuthGuard],
        children: [
          { path: '',          redirectTo: 'interview', pathMatch: 'full' },
          { path: 'interview', component: InterviewEvalComponent },
          { path: 'project',   component: ProjectReviewComponent },
          { path: 'final',     redirectTo: 'interview', pathMatch: 'full' },
        ]
      }
    ])
  ]
})
export class EvaluationsModule {}
