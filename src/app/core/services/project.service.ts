import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, Review, Evaluation } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> { return this.http.get<Project[]>(`${this.base}/projects/getProjects`); }
  getProject(id: number): Observable<Project> { return this.http.get<Project>(`${this.base}/projects/${id}`); }
  submitProject(p: Partial<Project>): Observable<Project> { return this.http.post<Project>(`${this.base}/projects/submitProject`, p); }
  updateProject(id: number, p: Partial<Project>): Observable<Project> { return this.http.put<Project>(`${this.base}/projects/update/${id}`, p); }
  deleteProject(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/projects/delete/${id}`); }

  getReviews(projectId: number): Observable<Review[]> { return this.http.get<Review[]>(`${this.base}/reviews/project/${projectId}/all`); }
  createReview(projectId: number, p: Partial<Review>): Observable<Review> { return this.http.post<Review>(`${this.base}/reviews/project/${projectId}`, p); }
  updateReview(reviewId: number, p: Partial<Review>): Observable<Review> { return this.http.put<Review>(`${this.base}/reviews/${reviewId}`, p); }

  getEvaluationsByBatch(batchId: number): Observable<Evaluation[]> { return this.http.get<Evaluation[]>(`${this.base}/evaluations/batch/${batchId}`); }
  calculateEvaluations(batchId: number): Observable<any> { return this.http.post(`${this.base}/evaluations/batch/${batchId}/calculate`, {}); }
  submitEvaluation(p: Partial<Evaluation>): Observable<Evaluation> { return this.http.post<Evaluation>(`${this.base}/evaluations/submitEvaluation`, p); }
  getAssociateEvaluation(batchId: number, associateId: number): Observable<Evaluation> {
    return this.http.get<Evaluation>(`${this.base}/evaluations/batch/${batchId}/associate/${associateId}`);
  }
}
