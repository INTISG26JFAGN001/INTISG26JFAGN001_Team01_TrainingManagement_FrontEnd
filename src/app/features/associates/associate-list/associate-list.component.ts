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
import { AssociateFormComponent } from '../associate-form/associate-form.component';

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
      error: () => { this.snack.open('Failed to load associates', 'Close', { duration: 3000 }); this.loading = false; }
    });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openAddForm(): void {
    this.dialog.open(AssociateFormComponent, { width: '480px' }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openEnrollment(associate: Associate): void {
    this.dialog.open(EnrollmentComponent, { width: '520px', data: associate }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  /** Returns display name — falls back to "User #userId" when fullName is missing (backend may not enrich response) */
  getDisplayName(a: Associate): string { return a.fullName || ('User #' + a.userId); }

  /** Returns display XP — maps int xp to label, or returns experienceLevel string as-is */
  getXpLabel(a: Associate): string {
    if (a.experienceLevel) return a.experienceLevel;
    const map: Record<number, string> = { 0: 'JUNIOR', 1: 'MID', 2: 'SENIOR' };
    return a.xp !== undefined ? (map[a.xp] ?? String(a.xp)) : '—';
  }

  getXpClass(xp: string): string {
    const map: Record<string, string> = { JUNIOR: 'badge-junior', MID: 'badge-mid', SENIOR: 'badge-senior' };
    return map[xp?.toUpperCase()] ?? 'badge-junior';
  }
}
