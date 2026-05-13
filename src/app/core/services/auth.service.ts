import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models';

interface UserInfo {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'tms_access_token';
  private roleKey = 'tms_role';
  private userIdKey = 'tms_user_id';
  private usernameKey = 'tms_username';

  private loggedIn$ = new BehaviorSubject<boolean>(this.isLoggedIn());

  constructor(private http: HttpClient) {}

  login(payload: LoginRequest): Observable<UserInfo> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap(res => localStorage.setItem(this.tokenKey, res.accessToken)),
      switchMap(() => this.http.get<UserInfo>(`${environment.apiUrl}/user/username`, {
        params: { key: payload.username }
      })),
      tap(user => {
        localStorage.setItem(this.roleKey, user.roles[0]);
        localStorage.setItem(this.userIdKey, String(user.id));
        localStorage.setItem(this.usernameKey, user.username);
        this.loggedIn$.next(true);
      })
    );
  }

  refreshToken(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh-token`, {}, { withCredentials: true }).pipe(
      tap(res => localStorage.setItem(this.tokenKey, res.accessToken))
    );
  }

  logout(): void {
    localStorage.clear();
    this.loggedIn$.next(false);
  }

  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  getRole(): string | null { return localStorage.getItem(this.roleKey); }
  getUserId(): number { return Number(localStorage.getItem(this.userIdKey)); }
  getUsername(): string { return localStorage.getItem(this.usernameKey) ?? ''; }
  isLoggedIn(): boolean { return !!this.getToken(); }
  isAdmin(): boolean { return this.getRole() === 'ROLE_ADMIN'; }
  isTrainer(): boolean { return this.getRole() === 'ROLE_TRAINER'; }
  isAssociate(): boolean { return this.getRole() === 'ROLE_ASSOCIATE'; }
  isCoach(): boolean { return this.getRole() === 'ROLE_COACH'; }
  isTechLead(): boolean { return this.getRole() === 'ROLE_TECH_LEAD'; }
  isScrumLead(): boolean { return this.getRole() === 'ROLE_SCRUM_LEAD'; }
  hasRole(...roles: string[]): boolean { const r = this.getRole(); return !!r && roles.includes(r); }
  loggedIn(): Observable<boolean> { return this.loggedIn$.asObservable(); }
}