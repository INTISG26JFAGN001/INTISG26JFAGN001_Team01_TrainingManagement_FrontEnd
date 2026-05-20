import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';

import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

const MAT_MODULES = [
  MatIconModule, MatButtonModule, MatSidenavModule, MatToolbarModule,
  MatListModule, MatMenuModule, MatDividerModule, MatTooltipModule,
  MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
  MatInputModule, MatSelectModule, MatCardModule, MatChipsModule,
  MatBadgeModule, MatProgressSpinnerModule, MatProgressBarModule,
  MatSnackBarModule, MatDialogModule, MatDatepickerModule, MatNativeDateModule,
  MatCheckboxModule, MatTabsModule, MatExpansionModule, MatStepperModule,
  MatAutocompleteModule, MatRadioModule
];

@NgModule({
  declarations: [SidebarComponent, HeaderComponent, ConfirmDialogComponent],
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ...MAT_MODULES],
  exports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule,
    SidebarComponent, HeaderComponent, ConfirmDialogComponent,
    ...MAT_MODULES
  ]
})
export class SharedModule {}
