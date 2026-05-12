import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowed: string[] = route.data['roles'] ?? [];
    const role = this.auth.getRole();
    if (allowed.length === 0 || (role && allowed.includes(role))) return true;
    return this.router.createUrlTree(['/dashboard']);
  }
}
