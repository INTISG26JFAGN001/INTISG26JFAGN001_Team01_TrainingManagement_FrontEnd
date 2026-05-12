import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LandingComponent } from './landing.component';

@NgModule({
  declarations: [LandingComponent],
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule.forChild([
      { path: '', component: LandingComponent }
    ])
  ]
})
export class LandingModule {}
