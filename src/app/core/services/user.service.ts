import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, SignupRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> { return this.http.get<User[]>(`${this.base}/user/all`); }
  getById(id: number): Observable<User> { return this.http.get<User>(`${this.base}/user/${id}`); }
  searchByUsername(key: string): Observable<User[]> { return this.http.get<User[]>(`${this.base}/user/username`, { params: { key } }); }
  searchByEmail(key: string): Observable<User[]> { return this.http.get<User[]>(`${this.base}/user/email`, { params: { key } }); }
  create(payload: SignupRequest): Observable<any> { return this.http.post(`${this.base}/auth/signup`, payload); }
  update(payload: Partial<User>): Observable<User> { return this.http.put<User>(`${this.base}/user/update`, payload); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/user/${id}`); }
}
