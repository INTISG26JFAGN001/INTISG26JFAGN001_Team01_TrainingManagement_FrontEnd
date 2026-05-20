import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

import { MyQuizzesComponent } from './my-quizzes/my-quizzes.component';
import { QuizAttemptDialogComponent } from './my-quizzes/quiz-attempt-dialog.component';
import { MyResultsComponent } from './my-results/my-results.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { MyProjectsComponent } from './my-projects/my-projects.component';
import { MySchedulesComponent } from './my-schedules/my-schedules.component';
import { MyLeaderboardComponent } from './my-leaderboard/my-leaderboard.component';

const routes: Routes = [
  { path: '', redirectTo: 'quizzes', pathMatch: 'full' },
  { path: 'quizzes', component: MyQuizzesComponent },
  { path: 'results', component: MyResultsComponent },
  { path: 'profile', component: MyProfileComponent },
  { path: 'projects', component: MyProjectsComponent },
  { path: 'schedules', component: MySchedulesComponent },
  { path: 'leaderboard', component: MyLeaderboardComponent }
];

@NgModule({
  declarations: [
    MyQuizzesComponent,
    QuizAttemptDialogComponent,
    MyResultsComponent,
    MyProfileComponent,
    MyProjectsComponent,
    MySchedulesComponent,
    MyLeaderboardComponent
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
