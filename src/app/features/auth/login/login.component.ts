import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });
  loading = false;
  hidePassword = true;
  features = [
    { icon: 'groups', text: 'Manage Training Batches' },
    { icon: 'quiz', text: 'Assessments & Evaluations' },
    { icon: 'bar_chart', text: 'Performance Analytics' },
    { icon: 'menu_book', text: 'Course Catalog Management' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Invalid credentials', 'Close', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }
}
