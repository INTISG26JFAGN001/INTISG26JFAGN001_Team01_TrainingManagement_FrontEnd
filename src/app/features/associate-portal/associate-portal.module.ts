import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

import { MyQuizzesComponent } from './my-quizzes/my-quizzes.component';
import { QuizAttemptDialogComponent } from './my-quizzes/quiz-attempt-dialog.component';
import { MyResultsComponent } from './my-results/my-results.component';

const routes: Routes = [
  { path: '', redirectTo: 'quizzes', pathMatch: 'full' },
  { path: 'quizzes', component: MyQuizzesComponent },
  { path: 'results', component: MyResultsComponent }
];

@NgModule({
  declarations: [
    MyQuizzesComponent,
    QuizAttemptDialogComponent,
    MyResultsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class AssociatePortalModule {}
