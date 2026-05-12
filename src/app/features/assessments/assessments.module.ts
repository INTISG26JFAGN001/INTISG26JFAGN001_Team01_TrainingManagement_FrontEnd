import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { QuizListComponent } from './quiz-list/quiz-list.component';
import { InterviewListComponent } from './interview-list/interview-list.component';
import { AssessmentsLayoutComponent } from './assessments-layout/assessments-layout.component';
import { QuizFormComponent } from './quiz-form/quiz-form.component';
import { InterviewFormComponent } from './interview-form/interview-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [
    QuizListComponent,
    InterviewListComponent,
    AssessmentsLayoutComponent,
    QuizFormComponent,
    InterviewFormComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: AssessmentsLayoutComponent,
        canActivate: [AuthGuard],
        children: [
          { path: '', redirectTo: 'quizzes', pathMatch: 'full' },
          { path: 'quizzes', component: QuizListComponent },
          { path: 'interviews', component: InterviewListComponent },
        ]
      }
    ])
  ]
})
export class AssessmentsModule {}
