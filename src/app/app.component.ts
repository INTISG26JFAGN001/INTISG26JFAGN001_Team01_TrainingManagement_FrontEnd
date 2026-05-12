import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  sidenavOpen = true;
  private currentUrl = '';

  private SHELL_LESS = ['/landing', '/auth'];

  get showShell(): boolean {
    return this.isLoggedIn && !this.SHELL_LESS.some(p => this.currentUrl.startsWith(p));
  }

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.auth.loggedIn().subscribe(v => this.isLoggedIn = v);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentUrl = e.urlAfterRedirects;
    });
    this.currentUrl = this.router.url;
  }
}
