import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BatchListComponent } from './batch-list/batch-list.component';
import { BatchDetailComponent } from './batch-detail/batch-detail.component';
import { BatchFormComponent } from './batch-form/batch-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';

@NgModule({
  declarations: [BatchListComponent, BatchDetailComponent, BatchFormComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: '', component: BatchListComponent, canActivate: [AuthGuard] },
      { path: ':id', component: BatchDetailComponent, canActivate: [AuthGuard] }
    ])
  ]
})
export class BatchesModule {}
