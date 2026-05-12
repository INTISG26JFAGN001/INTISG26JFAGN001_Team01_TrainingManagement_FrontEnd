import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { UserListComponent } from './user-list/user-list.component';
import { UserFormComponent } from './user-form/user-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

@NgModule({
  declarations: [UserListComponent, UserFormComponent],
  imports: [
    SharedModule,
    RouterModule.forChild([{ path: '', component: UserListComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['ROLE_ADMIN'] } }])
  ]
})
export class UsersModule {}
