import { Component, Inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { FormBuilder, Validators } from "@angular/forms";
import { Schedule } from "src/app/core/models";
import { ScheduleService } from "src/app/core/services/schedule.service";
import { ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
    selector: 'app-schedule-form-dialog',
    standalone: true,
    imports: [MatInputModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatSelectModule, ReactiveFormsModule, CommonModule, MatButtonModule],
    template: `
        <h2 mat-dialog-title>
        <mat-icon>{{ data ? 'edit' : 'add_circle' }}</mat-icon>
        {{ data ? 'Edit Schedule' : 'New Schedule' }}
        </h2>

        <mat-dialog-content>
        <!-- Context row shown when editing -->
        <div *ngIf="data" class="context-row">
            <span class="id-chip">#{{ data.id }}</span>
            <span class="context-name">{{ data.batchId }}</span>
        </div>

        <form [formGroup]="form" class="dialog-form">
            <div class="form-row">
            <mat-form-field appearance="outline" class="field-title">
                <mat-label>Session Date</mat-label>
                <input matInput formControlName="sessionDate" type="datetime-local"/>
                <mat-error>Title is required</mat-error>
            </mat-form-field>
            </div>
        </form>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
        <button mat-stroked-button [mat-dialog-close]="false">Cancel</button>
        <button mat-flat-button color="primary" (click)="update()" >
            {{ saving ? 'Updating...' : (data ? 'Update' : 'Create') }}
        </button>
        </mat-dialog-actions>
    `,
    styles: [`
        .id-chip {
        display: inline-block; padding: 2px 8px; border-radius: 6px;
        font-size: 12px; font-weight: 700; font-family: monospace;
        background: rgba(0,198,255,0.08); color: var(--accent);
        border: 1px solid rgba(0,198,255,0.2);
        }

        .code-chip {
        display: inline-block; padding: 2px 8px; border-radius: 6px;
        font-size: 12px; font-weight: 700; font-family: monospace;
        background: rgba(255,255,255,0.06); color: var(--text-secondary);
        border: 1px solid var(--border);
        }

        .course-cell { display: flex; align-items: center; gap: 8px; }
        .course-icon { font-size: 18px; color: var(--accent); }
        .tech-chip { background: rgba(167,139,250,0.12); color: #a78bfa; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid rgba(167,139,250,0.25); }

        `]
})
export class ScheduleFormDialog {
    form = this.fb.group({
        id: [-1 as number, Validators.required],
        scheduleId: [null as number | null, Validators.required],
        batchId: [null as number | null, Validators.required],
        sessionDate: ['', Validators.required]
    })
    schedules: Schedule[] = [];
    saving = false;
    constructor(
        private fb: FormBuilder,
        private svc: ScheduleService,
        private snack: MatSnackBar,
        private dialogRef: MatDialogRef<ScheduleFormDialog>,
        @Inject(MAT_DIALOG_DATA) public data: Schedule
    ) { }

    ngOnInit() {
        this.svc.getAll().subscribe(s => {
            this.schedules = s;

            if (this.data) {
                const matched = this.schedules.find(s => s.scheduleId === this.data?.scheduleId);

                console.log(matched);
                this.form.patchValue({
                    id: this.data.id,
                    scheduleId: this.data.scheduleId,
                    batchId: this.data.batchId,
                    sessionDate: this.data.sessionDate
                })
            }
        });
    }

    update() {
        if (this.data.scheduleId && String(this.form.value.sessionDate)) {
            
            this.svc.updateSessionDate(this.data.scheduleId, String(this.form.value.sessionDate)).subscribe({
                next: (res) => {
                    console.log(res); 
                    this.snack.open(`Technology ${this.data ? 'updated' : 'created'}`, 'Close', { duration: 3000 });
                    this.dialogRef.close(true);
                },
                error: (res) => {
                    console.log(res); 
                    this.snack.open(`Error Occured`, 'Close', { duration: 3000 });
                    this.dialogRef.close(true);
                }
            });
        }
    }
}