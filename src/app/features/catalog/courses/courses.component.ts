import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogService } from '../../../core/services/catalog.service';
import { Course, Technology } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CourseFormDialogComponent } from './course-form-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-courses', templateUrl: './courses.component.html', styleUrls: ['./courses.component.scss'] })
export class CoursesComponent implements OnInit {
  displayedColumns = ['id', 'code', 'title', 'technology', 'duration', 'actions'];
  dataSource = new MatTableDataSource<Course>();
  technologies: Technology[] = [];
  loading = true;
  canEdit = ['ROLE_ADMIN', 'ROLE_TECH_LEAD'].includes(this.auth.getRole() ?? '');

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private svc: CatalogService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.load();
    this.svc.getTechnologies().subscribe(t => this.technologies = t);
  }

  load(): void {
    this.loading = true;
    this.svc.getCourses().subscribe({
      next: d => {
        this.dataSource.data = d;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openForm(c?: Course): void {
    console.log(c);
    this.dialog.open(CourseFormDialogComponent, {
      width: '560px',
      data: c ?? null
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(c: Course): void {
    console.log(c);
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Course', message: `Delete "${c.title}"?`, danger: true, confirmText: 'Delete' }
    }).afterClosed().subscribe(conf => {
      if (conf) this.svc.deleteCourse(c.id).subscribe({
        next: (res) => { console.log(res);this.snack.open('Course deleted', 'Close', { duration: 3000 }); this.load(); },
        error: (res) => {console.log(res);this.snack.open('Failed to delete', 'Close', { duration: 3000 })}
      });
    });
  }

  getTechName(c: Course): string {
    return c.technologyName || this.technologies.find(t => t.id === c.technologyId)?.name || '—';
  }
}
