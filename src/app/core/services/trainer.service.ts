import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Trainer, Technology } from '../models';

@Injectable({ providedIn: 'root' })
export class TrainerService {
  private base = `${environment.apiUrl}/trainer`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Trainer[]> { return this.http.get<Trainer[]>(this.base); }
  getById(id: number): Observable<Trainer> { return this.http.get<Trainer>(`${this.base}/${id}`); }
  create(p: Partial<Trainer>): Observable<Trainer> { return this.http.post<Trainer>(this.base, p); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  getTechnologies(id: number): Observable<Technology[]> { return this.http.get<Technology[]>(`${this.base}/${id}/technologies`); }
  updateTechnologies(id: number, techIds: number[]): Observable<Trainer> {
    return this.http.put<Trainer>(`${this.base}/${id}/technologies`, techIds);
  }
  getByTechnology(technologyId: number): Observable<Trainer[]> {
    return this.http.get<Trainer[]>(this.base + '/technology', { params: { technologyId } });
  }
}
