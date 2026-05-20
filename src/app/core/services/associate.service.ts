import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Associate, Enrollment, EnrollmentStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class AssociateService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Associate[]> { return this.http.get<Associate[]>(`${this.base}/associates`); }
  getById(userId: number): Observable<Associate> { return this.http.get<Associate>(`${this.base}/associates/${userId}`); }
  getByBatch(batchId: number): Observable<Associate[]> { return this.http.get<Associate[]>(`${this.base}/associates/batch`, { params: { id: batchId } }); }
  // Backend returns plain text "Associate created successfully" on 201
  create(p: { userId: number; batchid: number; xp: number }): Observable<string> {
    return this.http.post(`${this.base}/associates/create`, p, { responseType: 'text' });
  }
  update(p: Partial<Associate>): Observable<string> { return this.http.put(`${this.base}/associates/update`, p, { responseType: 'text' }); }
  // DELETE /associates/{id}  — uses associate primary-key id, not userId
  delete(id: number): Observable<string> { return this.http.delete(`${this.base}/associates/${id}`, { responseType: 'text' }); }

  // Enrollments
  getAllEnrollments(): Observable<Enrollment[]> { return this.http.get<Enrollment[]>(`${this.base}/enrollment`); }
  getEnrollmentById(id: number): Observable<Enrollment> { return this.http.get<Enrollment>(`${this.base}/enrollment/${id}`); }
  getEnrollmentsByBatch(batchId: number): Observable<Enrollment[]> { return this.http.get<Enrollment[]>(`${this.base}/enrollment/batch`, { params: { id: batchId } }); }
  getEnrollmentsByAssociate(associateId: number): Observable<Enrollment[]> { return this.http.get<Enrollment[]>(`${this.base}/enrollment/associate`, { params: { id: associateId } }); }
  getMyEnrollment(associateId: number): Observable<Enrollment> { return this.http.get<Enrollment>(`${this.base}/enrollment/associate`, { params: { id: associateId } }); }
  createEnrollment(p: Partial<Enrollment>): Observable<Enrollment> { return this.http.post<Enrollment>(`${this.base}/enrollment`, p); }
  updateEnrollmentStatus(id: number, val: EnrollmentStatus): Observable<Enrollment> {
    return this.http.put<Enrollment>(`${this.base}/enrollment/${id}/status`, null, { params: { val } });
  }
  deleteEnrollment(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/enrollment/${id}`); }
}
