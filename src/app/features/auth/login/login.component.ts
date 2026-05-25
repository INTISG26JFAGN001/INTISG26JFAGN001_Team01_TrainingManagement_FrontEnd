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
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });
  loading = false;
  hidePassword = true;
  submitClick = false;
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
  ) {
    if(auth.isLoggedIn()){
      router.navigate(['/dashboard']);
    }
  }



  submit(): void {
    this.submitClick = true;
    console.log(this.loading);
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Invalid credentials', 'Close', { duration: 4000, panelClass: 'snack-error' });
      }
    });
    this.submitClick = false;
  }
  redirectToHome(){
    this.router.navigateByUrl("/");
  }
}
