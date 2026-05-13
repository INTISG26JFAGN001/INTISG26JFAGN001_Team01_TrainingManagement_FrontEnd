// Auth
export interface LoginRequest { username: string; password: string; }
export interface LoginResponse {
  timestamp: string;
  message: string;
  loginSuccess: boolean;
  accessToken: string;
}
export interface SignupRequest { username: string; password: string; email: string; fullName: string; roles: string[]; }

// User
export interface User { id: number; username: string; email: string; fullName: string; roles: string[]; }

// Technology — matches TechnologyResponseDTO { id, name }
export interface Technology { id: number; name: string; }

// Course — matches CourseResponseDTO { id, code, title, technologyName, durationDays }
export interface Course {
  id: number; code: string; title: string;
  technologyId?: number; technologyName?: string; durationDays: number;
}
export interface CourseRequest { code: string; title: string; technologyId: number; durationDays: number; }

// Stage
export interface Stage { id: number; name: string; description: string; courseId: number; order: number; }

// Trainer — matches TrainerDTO { trainerId, userId, technologyIds, technologyNames }
export interface Trainer {
  id?: number; trainerId?: number; userId: number;
  fullName?: string; email?: string;
  technologyIds?: number[]; technologyNames?: string[];
  technologies?: Technology[];
}

// Associate — matches AssociateDTO { id, userId, batchId, xp }; fullName/email may come from enriched response
export interface Associate {
  id: number; userId: number; fullName?: string; email?: string;
  xp?: number; experienceLevel?: string; batchId?: number; currentBatchId?: number;
}

// Batch — matches BatchDetailsDTO { id, trainerId, status, startDate, endDate, courseIds, courseNames }
export type BatchStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
export interface Batch {
  id: number; trainerId: number; status: BatchStatus;
  startDate: string; endDate: string;
  courseIds?: number[]; courseNames?: string[];
}
export interface BatchDetails extends Batch { associates: Associate[]; }

// Enrollment — matches EnrollmentDTO { enrollmentId, batchId, associateId, status, joinDate }
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'PENDING';
export interface Enrollment {
  id?: number; enrollmentId?: number;
  associateId: number; batchId: number; status: EnrollmentStatus;
  joinDate?: string; enrollmentDate?: string;
  associateName?: string; batchName?: string;
}

// Schedule — matches ScheduleDTO { scheduleId, batchId, sessionDate }
export interface Schedule {
  id?: number; scheduleId?: number; batchId: number; sessionDate: string;
}

// Assessment
export type AssessmentType = 'QUIZ' | 'INTERVIEW';
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export interface Assessment {
  id: number; title: string; type: AssessmentType; status: AssessmentStatus;
  batchId: number; batchName?: string; createdAt: string;
}

// Matches QuizQuestionResponse { id, questionText, optionA-D, marks }
export interface QuizQuestion {
  id?: number;
  questionText: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  marks?: number;
}
// Matches QuizDetailResponse; passingMarks (NOT passingScore)
export interface Quiz extends Assessment { questions: QuizQuestion[]; durationMinutes?: number; passingMarks?: number; }
// Matches InterviewDetailResponse
export type InterviewCategory = 'INTERIM' | 'FINAL';
export interface Interview extends Assessment {
  interviewCategory?: InterviewCategory;
  scheduledDateTime?: string;
  dueDate?: string;
  evaluatorRole?: string;
  maxScore?: number;
  rubrics?: Rubric[];
}
export interface Rubric { id: number; assessmentId: number; criteria: string; weight: number; description: string; }

// Project
export interface Project {
  id: number; title: string; description: string; batchId: number; associateId: number;
  submissionDate: string; repositoryUrl: string; associateName?: string;
}

// Review
export interface Review {
  id: number; projectId: number; reviewerId: number; reviewerName?: string;
  score: number; comments: string; reviewDate: string;
}

// Evaluation
export interface Evaluation {
  id: number; batchId: number; associateId: number; associateName?: string;
  totalScore: number; quizScore: number; interviewScore: number; projectScore: number;
}

// Pagination
export interface PagedResponse<T> { content: T[]; totalElements: number; totalPages: number; size: number; number: number; }

// Error
export interface ApiError { timestamp: string; message: string; errorCode: string; path: string; }
