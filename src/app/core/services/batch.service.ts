import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Batch, BatchDetails, BatchStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private base = `${environment.apiUrl}/batches`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Batch[]> { return this.http.get<Batch[]>(this.base); }
  getById(id: number): Observable<Batch> { return this.http.get<Batch>(`${this.base}/${id}`); }
  getDetails(id: number): Observable<BatchDetails> { return this.http.get<BatchDetails>(`${this.base}/${id}/details`); }
  create(p: Partial<Batch>): Observable<Batch> { return this.http.post<Batch>(this.base, p); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  updateStatus(id: number, status: BatchStatus): Observable<Batch> {
    return this.http.put<Batch>(`${this.base}/${id}/status`, null, { params: { status } });
  }
  filterByStatus(status: BatchStatus): Observable<Batch[]> {
    return this.http.get<Batch[]>(`${this.base}/status`, { params: { status } });
  }
  filterByTrainer(trainerId: number): Observable<Batch[]> {
    return this.http.get<Batch[]>(`${this.base}/trainer`, { params: { trainer_id: trainerId } });
  }
}
