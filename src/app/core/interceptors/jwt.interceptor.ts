import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token  = this.authService.getToken();
    const userId = this.authService.getUserId();
    // X-User-Role is read by microservices (e.g. asm-service QuizController) to
    // make role-aware decisions — e.g. skip trainer-record validation for ROLE_ADMIN.
    // AuthService.getRole() reads 'tms_role' from localStorage, stored at login time.
    const role   = this.authService.getRole();

    const authReq = token
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            ...(userId ? { 'X-User-Id':   String(userId) } : {}),
            ...(role   ? { 'X-User-Role': role            } : {})
          }
        })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/auth/')) {
          return this.handle401(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((res) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(res.accessToken);
          const uid  = this.authService.getUserId();
          const role = this.authService.getRole();
          return next.handle(req.clone({
            setHeaders: {
              Authorization: `Bearer ${res.accessToken}`,
              ...(uid  ? { 'X-User-Id':   String(uid) } : {}),
              ...(role ? { 'X-User-Role': role         } : {})
            }
          }));
        }),
        catchError(() => {
          this.isRefreshing = false;
          this.authService.logout();
          this.router.navigate(['/auth/login']);
          return throwError(() => new Error('Session expired'));
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter(t => t !== null),
      take(1),
      switchMap(token => next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })))
    );
  }
}
