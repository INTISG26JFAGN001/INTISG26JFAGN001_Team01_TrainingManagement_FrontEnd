import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, Validators } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { Course, Technology } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-courses', templateUrl: './courses.component.html', styleUrls: ['./courses.component.scss'] })
export class CoursesComponent implements OnInit {
  displayedColumns = ['code', 'title', 'technology', 'duration', 'actions'];
  dataSource = new MatTableDataSource<Course>();
  technologies: Technology[] = [];
  loading = true; showForm = false; editId: number | null = null; saving = false;
  canEdit = ['ROLE_ADMIN', 'ROLE_TECH_LEAD'].includes(this.auth.getRole() ?? '');

  form = this.fb.group({
    code: ['', Validators.required],
    title: ['', Validators.required],
    technologyId: [null as number | null, Validators.required],
    durationDays: [30, Validators.required]
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private svc: CatalogService, private dialog: MatDialog, private snack: MatSnackBar, private fb: FormBuilder, private auth: AuthService) {}

  ngOnInit(): void { this.load(); this.svc.getTechnologies().subscribe(t => this.technologies = t); }

  load(): void {
    this.loading = true;
    this.svc.getCourses().subscribe({
      next: d => { this.dataSource.data = d; this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; this.loading = false; },
      error: () => this.loading = false
    });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openForm(c?: Course): void {
    this.showForm = true;
    this.editId = c?.id ?? null;
    this.form.patchValue(c ?? { code: '', title: '', technologyId: null, durationDays: 30 } as any);
  }

  closeForm(): void { this.showForm = false; this.editId = null; this.form.reset({ durationDays: 30 }); }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = this.form.value as any;
    const action = this.editId ? this.svc.updateCourse(this.editId, payload) : this.svc.createCourse(payload);
    action.subscribe({
      next: () => { this.snack.open(`Course ${this.editId ? 'updated' : 'created'}`, 'Close', { duration: 3000 }); this.closeForm(); this.load(); this.saving = false; },
      error: () => { this.saving = false; }
    });
  }

  delete(c: Course): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Course', message: `Delete "${c.title}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(conf => { if (conf) this.svc.deleteCourse(c.id).subscribe({ next: () => { this.snack.open('Deleted', 'Close', { duration: 3000 }); this.load(); } }); });
  }

  getTechName(c: Course): string { return c.technologyName || this.technologies.find(t => t.id === c.technologyId)?.name || '—'; }
}