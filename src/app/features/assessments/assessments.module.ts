import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { QuizListComponent } from './quiz-list/quiz-list.component';
import { QuizResultsDialogComponent } from './quiz-list/quiz-results-dialog.component';
import { QuizDetailDialogComponent } from './quiz-list/quiz-detail-dialog.component';
import { InterviewListComponent } from './interview-list/interview-list.component';
import { InterviewResultsDialogComponent } from './interview-list/interview-results-dialog.component';
import { InterviewDetailDialogComponent } from './interview-list/interview-detail-dialog.component';
import { AssessmentsLayoutComponent } from './assessments-layout/assessments-layout.component';
import { QuizFormComponent } from './quiz-form/quiz-form.component';
import { InterviewFormComponent } from './interview-form/interview-form.component';
import { InterviewRubricDialogComponent } from './interview-rubric-dialog/interview-rubric-dialog.component';
import { ProjectListComponent } from './projects/project-list.component';
import { ProjectFormDialogComponent } from './projects/project-form-dialog.component';
import { ProjectDetailDialogComponent } from './projects/project-detail-dialog.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [
    QuizListComponent,
    QuizResultsDialogComponent,
    QuizDetailDialogComponent,
    InterviewListComponent,
    InterviewResultsDialogComponent,
    InterviewDetailDialogComponent,
    AssessmentsLayoutComponent,
    QuizFormComponent,
    InterviewFormComponent,
    InterviewRubricDialogComponent,
    ProjectListComponent,
    ProjectFormDialogComponent,
    ProjectDetailDialogComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: AssessmentsLayoutComponent,
        canActivate: [AuthGuard],
        children: [
          { path: '',          redirectTo: 'quizzes', pathMatch: 'full' },
          { path: 'quizzes',   component: QuizListComponent },
          { path: 'interviews',component: InterviewListComponent },
          { path: 'projects',  component: ProjectListComponent },
        ]
      }
    ])
  ]
})
export class AssessmentsModule {}
