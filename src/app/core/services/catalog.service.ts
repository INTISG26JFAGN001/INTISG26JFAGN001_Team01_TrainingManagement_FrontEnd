import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Technology, Course, Stage } from '../models';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // Technologies
  getTechnologies(): Observable<Technology[]> { return this.http.get<Technology[]>(`${this.base}/technologies`); }
  getTechnology(id: number): Observable<Technology> { return this.http.get<Technology>(`${this.base}/technologies/${id}`); }
  createTechnology(p: Partial<Technology>): Observable<Technology> { return this.http.post<Technology>(`${this.base}/technologies`, p); }
  updateTechnology(id: number, p: Partial<Technology>): Observable<Technology> { return this.http.put<Technology>(`${this.base}/technologies/${id}`, p); }
  deleteTechnology(id: number): Observable<any> { return this.http.delete<void>(`${this.base}/technologies/${id}`) }

  // Courses
  getCourses(): Observable<Course[]> { return this.http.get<Course[]>(`${this.base}/courses`); }
  getCourse(id: number): Observable<Course> { return this.http.get<Course>(`${this.base}/courses/${id}`); }
  createCourse(p: Partial<Course>): Observable<Course> { return this.http.post<Course>(`${this.base}/courses`, p); }
  updateCourse(id: number, p: Partial<Course>): Observable<Course> { return this.http.put<Course>(`${this.base}/courses/${id}`, p); }
  deleteCourse(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/courses/${id}`); }

  // Stages
  getStages(): Observable<Stage[]> { return this.http.get<Stage[]>(`${this.base}/stages`); }
  getStage(id: number): Observable<Stage> { return this.http.get<Stage>(`${this.base}/stages/${id}`); }
  createStage(p: Partial<Stage>): Observable<Stage> { return this.http.post<Stage>(`${this.base}/stages`, p); }
  updateStage(id: number, p: Partial<Stage>): Observable<Stage> { return this.http.put<Stage>(`${this.base}/stages/${id}`, p); }
  deleteStage(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/stages/${id}`); }
}
