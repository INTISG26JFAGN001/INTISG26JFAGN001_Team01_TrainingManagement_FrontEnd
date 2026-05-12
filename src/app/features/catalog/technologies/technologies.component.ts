import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, Validators } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { Technology } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-technologies', templateUrl: './technologies.component.html', styleUrls: ['./technologies.component.scss'] })
export class TechnologiesComponent implements OnInit {
  displayedColumns = ['name', 'description', 'actions'];
  dataSource = new MatTableDataSource<Technology>();
  loading = true;
  showForm = false;
  editId: number | null = null;
  saving = false;
  canEdit = ['ROLE_ADMIN','ROLE_TECH_LEAD'].includes(this.auth.getRole() ?? '');

  form = this.fb.group({ name: ['', Validators.required], description: [''] });

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private svc: CatalogService, private dialog: MatDialog, private snack: MatSnackBar, private fb: FormBuilder, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getTechnologies().subscribe({ next: d => { this.dataSource.data = d; this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; this.loading = false; }, error: () => this.loading = false });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openForm(t?: Technology): void {
    this.showForm = true; this.editId = t?.id ?? null;
    this.form.patchValue(t ?? { name: '', description: '' });
  }

  closeForm(): void { this.showForm = false; this.editId = null; this.form.reset(); }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const action = this.editId ? this.svc.updateTechnology(this.editId, this.form.value as any) : this.svc.createTechnology(this.form.value as any);
    action.subscribe({ next: () => { this.snack.open(`Technology ${this.editId ? 'updated' : 'created'}`, 'Close', { duration: 3000 }); this.closeForm(); this.load(); this.saving = false; }, error: () => { this.snack.open('Error saving', 'Close', { duration: 3000 }); this.saving = false; } });
  }

  delete(t: Technology): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Technology', message: `Delete "${t.name}"?`, danger: true, confirmText: 'Delete' } })
      .afterClosed().subscribe(c => { if (c) this.svc.deleteTechnology(t.id).subscribe({ next: () => { this.snack.open('Deleted', 'Close', { duration: 3000 }); this.load(); } }); });
  }
}
