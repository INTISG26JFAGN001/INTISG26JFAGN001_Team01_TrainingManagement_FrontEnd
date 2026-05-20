import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Schedule } from '../models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private base = `${environment.apiUrl}/schedule`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Schedule[]> { return this.http.get<Schedule[]>(this.base); }
  getById(id: number): Observable<Schedule> { return this.http.get<Schedule>(`${this.base}/${id}`); }
  getByBatch(batchId: number): Observable<Schedule[]> { return this.http.get<Schedule[]>(`${this.base}/batch`, { params: { id: batchId } }); }
  create(p: Partial<Schedule>): Observable<Schedule> { return this.http.post<Schedule>(this.base, p); }
  updateSessionDate(id: number, sessionDate: string): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base}/${id}/session-date`, null, { params: { sessionDate } });
  }
  deleteSchedule(id:number):Observable<Schedule>{
    return this.http.delete<Schedule>(`${this.base}/${id}`);
  }
}
