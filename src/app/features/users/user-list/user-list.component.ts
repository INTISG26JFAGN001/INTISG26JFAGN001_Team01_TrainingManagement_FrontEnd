import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserFormComponent } from '../user-form/user-form.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  displayedColumns = ['id', 'username', 'fullName', 'email', 'role', 'actions'];
  dataSource = new MatTableDataSource<User>();
  loading = true;
  filterUsername = signal('');

  @ViewChild(MatPaginator) set paginator(mp: MatPaginator | null) { if (mp) this.dataSource.paginator = mp; }
  @ViewChild(MatSort) set sort(ms: MatSort | null) { if (ms) this.dataSource.sort = ms; }

  constructor(private svc: UserService, private dialog: MatDialog, private snack: MatSnackBar, 
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void { 
    this.load();
   }

  load(): void {
    this.loading = true;
    this.svc.getAll().subscribe({ next: (data) => { this.dataSource.data = data; this.loading = false; }, error: () => this.loading = false });
  }

  filterUsers(e: Event): void { this.filterUsername.set((e.target as HTMLInputElement)?.value); this.applyFilter();}

  applyFilter(): void { this.dataSource.filter = this.filterUsername().trim().toLowerCase(); }

  openForm(user?: User): void {
    this.dialog.open(UserFormComponent, { width: '500px', data: user }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(user: User): void {
    const displayName = user.fullName || user.username;
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete User Account',
        message: `Permanently delete "${displayName}"?\n\nThis removes the user account and all login access. This action cannot be undone.`,
        danger: true,
        confirmText: 'Delete'
      }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.svc.delete(user.id).subscribe({
          next: () => { this.snack.open('User account deleted.', 'Close', { duration: 3000 }); this.load(); },
          error: (e) => this.snack.open(e.error?.message || 'Failed to delete user', 'Close', { duration: 3000 })
        });
      }
    });
  }

  /** Extracts the primary role from the roles array */
  getRole(u: User): string {
    const r = Array.isArray(u.roles) ? u.roles[0] : (u.roles as any);
    return r ?? '';
  }

  getRoleBadge(role: string): string {
    const map: Record<string,string> = { ROLE_ADMIN:'Admin', ROLE_TRAINER:'Trainer', ROLE_ASSOCIATE:'Associate', ROLE_COACH:'Coach', ROLE_TECH_LEAD:'Tech Lead', ROLE_SCRUM_LEAD:'Scrum Lead' };
    return map[role] ?? role;
  }

  getRoleClass(role: string): string {
    const map: Record<string,string> = { ROLE_ADMIN:'badge-admin', ROLE_TRAINER:'badge-trainer', ROLE_ASSOCIATE:'badge-associate', ROLE_COACH:'badge-coach', ROLE_TECH_LEAD:'badge-techlead', ROLE_SCRUM_LEAD:'badge-scrum' };
    return map[role] ?? '';
  }
}
