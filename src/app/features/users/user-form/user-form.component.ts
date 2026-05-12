import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-user-form',
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit User' : 'Create User' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username"/>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="fullName"/>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email"/>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width" *ngIf="!data">
          <mat-label>Password</mat-label>
          <input matInput formControlName="password" type="password"/>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            <mat-option *ngFor="let r of roles" [value]="r.value">{{ r.label }}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving...' : (data ? 'Update' : 'Create') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form{display:flex;flex-direction:column;gap:4px;padding-top:8px;min-width:400px}.full-width{width:100%}`]
})
export class UserFormComponent implements OnInit {
  roles = [
    { value: 'ROLE_ADMIN', label: 'Administrator' },
    { value: 'ROLE_TRAINER', label: 'Trainer' },
    { value: 'ROLE_ASSOCIATE', label: 'Associate' },
    { value: 'ROLE_COACH', label: 'Coach' },
    { value: 'ROLE_TECH_LEAD', label: 'Tech Lead' },
    { value: 'ROLE_SCRUM_LEAD', label: 'Scrum Lead' },
  ];
  form = this.fb.group({ username: ['', Validators.required], fullName: ['', Validators.required], email: ['', [Validators.required, Validators.email]], password: [''], role: ['ROLE_ASSOCIATE', Validators.required] });
  saving = false;

  constructor(private fb: FormBuilder, private svc: UserService, private snack: MatSnackBar, public dialogRef: MatDialogRef<UserFormComponent>, @Inject(MAT_DIALOG_DATA) public data: User) {}

  ngOnInit(): void { if (this.data) { this.form.patchValue(this.data); this.form.get('password')?.clearValidators(); } else { this.form.get('password')?.setValidators(Validators.required); } }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const action = this.data ? this.svc.update({ ...this.form.value as any, id: this.data.id }) : this.svc.create(this.form.value as any);
    action.subscribe({ next: () => { this.snack.open(`User ${this.data ? 'updated' : 'created'}`, 'Close', { duration: 3000 }); this.dialogRef.close(true); }, error: (e) => { this.snack.open(e.error?.message || 'Error', 'Close', { duration: 3000 }); this.saving = false; } });
  }
}
