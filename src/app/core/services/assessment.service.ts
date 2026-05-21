import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Assessment, Quiz, Interview, Rubric, AssessmentType, AssessmentStatus } from '../models';

export interface InterviewEvaluationRequest {
  assessmentId: number;
  associateId: number;
  evaluatorId: number;
  evaluatorRole?: string;
  evaluatorRemarks?: string;
  rubricScores: { rubricId: number; criteria?: string; weight: number; scoreAwarded: number; remarks?: string; }[];
}

export interface InterviewEvaluationResponse {
  id: number;
  assessmentId: number;
  associateId: number;
  evaluatorId: number;
  evaluatorRole: string;
  evaluatorRemarks: string;
  totalScore: number;
  maxScore: number;
  resultStatus: string;
  evaluatedAt: string;
  rubricScores: { id: number; rubricId: number; criteria: string; weight: number; scoreAwarded: number; remarks: string; }[];
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private base = `${environment.apiUrl}/assessments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Assessment[]> { return this.http.get<Assessment[]>(this.base); }
  getByBatch(batchId: number): Observable<Assessment[]> { return this.http.get<Assessment[]>(`${this.base}/batch/${batchId}`); }
  getByType(type: AssessmentType): Observable<Assessment[]> { return this.http.get<Assessment[]>(`${this.base}/type/${type}`); }
  update(id: number, p: Partial<Assessment>): Observable<Assessment> { return this.http.patch<Assessment>(`${this.base}/${id}`, p); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }

  // Quiz
  getQuizzesByBatch(batchId: number): Observable<Quiz[]> { return this.http.get<Quiz[]>(`${this.base}/quiz/batch/${batchId}`); }
  getQuiz(id: number): Observable<Quiz> { return this.http.get<Quiz>(`${this.base}/quiz/${id}`); }
  createQuiz(p: Partial<Quiz>): Observable<Quiz> { return this.http.post<Quiz>(`${this.base}/quiz`, p); }
  submitQuizAttempt(quizId: number, p: any): Observable<any> { return this.http.post(`${this.base}/quiz/${quizId}/attempt`, p); }
  getQuizResult(quizId: number, associateId: number): Observable<any> { return this.http.get(`${this.base}/quiz/${quizId}/attempts/${associateId}/result`); }
  getQuizAttempts(quizId: number): Observable<any[]> { return this.http.get<any[]>(`${this.base}/quiz/${quizId}/attempts`); }

  // Interview
  getInterviewsByBatch(batchId: number): Observable<Interview[]> { return this.http.get<Interview[]>(`${this.base}/interview/batch/${batchId}`); }
  getInterview(id: number): Observable<Interview> { return this.http.get<Interview>(`${this.base}/interview/${id}`); }
  createInterview(p: Partial<Interview>): Observable<Interview> { return this.http.post<Interview>(`${this.base}/interview`, p); }
  publishInterview(id: number): Observable<void> { return this.http.post<void>(`${this.base}/interview/${id}/publish`, {}); }
  getInterviewResults(id: number): Observable<any[]> { return this.http.get<any[]>(`${this.base}/interview/${id}/results`); }

  // Rubrics
  getRubrics(assessmentId: number): Observable<Rubric[]> { return this.http.get<Rubric[]>(`${this.base}/${assessmentId}/rubrics`); }
  createRubric(assessmentId: number, p: Partial<Rubric>): Observable<Rubric> { return this.http.post<Rubric>(`${this.base}/${assessmentId}/rubrics`, p); }
  deleteRubric(assessmentId: number, rubricId: number): Observable<void> { return this.http.delete<void>(`${this.base}/${assessmentId}/rubrics/${rubricId}`); }

  // Interview Evaluation (PES service)
  private evalBase = `${environment.apiUrl}/interview-evaluations`;
  submitInterviewEvaluation(p: InterviewEvaluationRequest): Observable<InterviewEvaluationResponse> {
    return this.http.post<InterviewEvaluationResponse>(this.evalBase, p);
  }
  getEvaluationsByAssessment(assessmentId: number): Observable<InterviewEvaluationResponse[]> {
    return this.http.get<InterviewEvaluationResponse[]>(`${this.evalBase}/assessment/${assessmentId}`);
  }
  getEvaluationByAssociate(assessmentId: number, associateId: number): Observable<InterviewEvaluationResponse> {
    return this.http.get<InterviewEvaluationResponse>(`${this.evalBase}/assessment/${assessmentId}/associate/${associateId}`);
  }
  getInterviewEvaluationsByAssociate(associateId: number): Observable<InterviewEvaluationResponse[]> {
    return this.http.get<InterviewEvaluationResponse[]>(`${this.evalBase}/associate/${associateId}`);
  }
}
