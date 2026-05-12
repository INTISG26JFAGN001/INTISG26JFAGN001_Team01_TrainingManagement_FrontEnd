import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssociateService } from '../../../core/services/associate.service';
import { Associate } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { EnrollmentComponent } from '../enrollment/enrollment.component';

@Component({ selector: 'app-associate-list', templateUrl: './associate-list.component.html', styleUrls: ['./associate-list.component.scss'] })
export class AssociateListComponent implements OnInit {
  dataSource = new MatTableDataSource<Associate>();
  loading = true;
  isAdmin = this.auth.isAdmin();
  isAssociate = this.auth.isAssociate();
  canManageEnrollment = this.auth.hasRole('ROLE_ADMIN', 'ROLE_TRAINER', 'ROLE_TECH_LEAD');
  myProfile: Associate | null = null;

  get displayedColumns(): string[] {
    if (this.isAssociate) return ['fullName', 'email', 'experienceLevel'];
    return ['fullName', 'email', 'experienceLevel', 'actions'];
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private svc: AssociateService, private dialog: MatDialog, private snack: MatSnackBar, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: d => {
        if (this.isAssociate) {
          const userId = this.auth.getUserId();
          this.myProfile = d.find((a: Associate) => a.userId === userId) ?? d[0] ?? null;
          this.dataSource.data = this.myProfile ? [this.myProfile] : [];
        } else {
          this.dataSource.data = d;
        }
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openEnrollment(associate: Associate): void {
    this.dialog.open(EnrollmentComponent, { width: '500px', data: associate }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  getXpClass(xp: string): string {
    const map: Record<string,string> = { JUNIOR:'badge-junior', MID:'badge-mid', SENIOR:'badge-senior' };
    return map[xp] ?? 'badge-junior';
  }
}
