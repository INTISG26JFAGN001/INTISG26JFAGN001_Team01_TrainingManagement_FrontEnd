import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TrainerService } from '../../../core/services/trainer.service';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-trainer-form',
  template: `
    <h2 mat-dialog-title><mat-icon>supervisor_account</mat-icon> Add Trainer</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>User ID</mat-label>
          <input matInput type="number" formControlName="userId" placeholder="Enter user ID"/>
          <mat-hint>The user must already exist in the system</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Technologies</mat-label>
          <mat-select formControlName="technologyIds" multiple>
            <mat-option *ngFor="let t of technologies" [value]="t.id">{{ t.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Adding...' : 'Add Trainer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form{display:flex;flex-direction:column;gap:8px;padding-top:8px;min-width:400px}.full-width{width:100%}h2[mat-dialog-title]{display:flex;align-items:center;gap:8px}`]
})
export class TrainerFormComponent implements OnInit {
  form = this.fb.group({ userId: [null, Validators.required], technologyIds: [[]] });
  technologies: any[] = [];
  saving = false;

  constructor(private fb: FormBuilder, private svc: TrainerService, private catalogSvc: CatalogService, private snack: MatSnackBar, public dialogRef: MatDialogRef<TrainerFormComponent>) {}

  ngOnInit(): void { this.catalogSvc.getTechnologies().subscribe(t => this.technologies = t); }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.svc.create({ userId: this.form.value.userId! } as any).subscribe({
      next: (trainer) => {
        const ids = (this.form.value.technologyIds ?? []) as number[];
        if (ids?.length) {
          this.svc.updateTechnologies(trainer.id, ids).subscribe({ next: () => { this.snack.open('Trainer added', 'Close', { duration: 3000 }); this.dialogRef.close(true); } });
        } else { this.snack.open('Trainer added', 'Close', { duration: 3000 }); this.dialogRef.close(true); }
      },
      error: (e) => { this.snack.open(e.error?.message || 'Error', 'Close', { duration: 3000 }); this.saving = false; }
    });
  }
}
