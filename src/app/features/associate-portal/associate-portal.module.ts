import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

import { MyBatchComponent } from './my-batch/my-batch.component';
import { MyQuizzesComponent } from './my-quizzes/my-quizzes.component';
import { QuizAttemptDialogComponent } from './my-quizzes/quiz-attempt-dialog.component';
import { MyResultsComponent } from './my-results/my-results.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { MyProjectsComponent } from './my-projects/my-projects.component';
import { MySchedulesComponent } from './my-schedules/my-schedules.component';
import { MyLeaderboardComponent } from './my-leaderboard/my-leaderboard.component';
import { MyInterviewsComponent } from './my-interviews/my-interviews.component';

const routes: Routes = [
  { path: '',           redirectTo: 'batch', pathMatch: 'full' },
  { path: 'batch',      component: MyBatchComponent },
  { path: 'schedules',  component: MySchedulesComponent },
  { path: 'quizzes',    component: MyQuizzesComponent },
  { path: 'interviews', component: MyInterviewsComponent },
  { path: 'projects',   component: MyProjectsComponent },
  { path: 'leaderboard',component: MyLeaderboardComponent },
  { path: 'profile',    component: MyProfileComponent },
  { path: 'results',    component: MyResultsComponent },  // kept for backwards compat
];

@NgModule({
  declarations: [
    MyBatchComponent,
    MyQuizzesComponent,
    QuizAttemptDialogComponent,
    MyResultsComponent,
    MyProfileComponent,
    MyProjectsComponent,
    MySchedulesComponent,
    MyLeaderboardComponent,
    MyInterviewsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class AssociatePortalModule {}
