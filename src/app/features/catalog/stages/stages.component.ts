import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, Validators } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { Stage, Course } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-stages', templateUrl: './stages.component.html', styleUrls: ['./stages.component.scss'] })
export class StagesComponent implements OnInit {
  displayedColumns = ['name', 'course', 'order', 'actions'];
  dataSource = new MatTableDataSource<Stage>();
  courses: Course[] = [];
  loading = true; showForm = false; editId: number | null = null; saving = false;
  canEdit = ['ROLE_ADMIN','ROLE_TECH_LEAD'].includes(this.auth.getRole() ?? '');
  form = this.fb.group({ name: ['', Validators.required], description: [''], courseId: [null, Validators.required], order: [1, Validators.required] });

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private svc: CatalogService, private dialog: MatDialog, private snack: MatSnackBar, private fb: FormBuilder, private auth: AuthService) {}

  ngOnInit(): void { this.load(); this.svc.getCourses().subscribe(c => this.courses = c); }

  load(): void {
    this.loading = true;
    this.svc.getStages().subscribe({ next: d => { this.dataSource.data = d; this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; this.loading = false; }, error: () => this.loading = false });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }
  openForm(s?: Stage): void { this.showForm = true; this.editId = s?.id ?? null; this.form.patchValue((s ?? { name:'', description:'', courseId: null, order: 1 }) as any); }
  closeForm(): void { this.showForm = false; this.editId = null; this.form.reset({ order: 1 }); }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const action = this.editId ? this.svc.updateStage(this.editId, this.form.value as any) : this.svc.createStage(this.form.value as any);
    action.subscribe({ next: () => { this.snack.open(`Stage ${this.editId ? 'updated' : 'created'}`, 'Close', { duration: 3000 }); this.closeForm(); this.load(); this.saving = false; }, error: () => { this.saving = false; } });
  }

  delete(s: Stage): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Stage', message: `Delete "${s.name}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(c => { if (c) this.svc.deleteStage(s.id).subscribe({ next: () => { this.snack.open('Deleted', 'Close', { duration: 3000 }); this.load(); } }); });
  }

  getCourseName(id: number): string { return this.courses.find(c => c.id === id)?.title ?? '—'; }
}
