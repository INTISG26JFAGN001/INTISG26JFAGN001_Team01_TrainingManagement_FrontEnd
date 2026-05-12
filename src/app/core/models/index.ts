// Auth
export interface LoginRequest { username: string; password: string; }
export interface LoginResponse { accessToken: string; role: string; userId: number; username: string; }
export interface SignupRequest { username: string; password: string; email: string; fullName: string; role: string; }

// User
export interface User { id: number; username: string; email: string; fullName: string; role: string; }

// Technology
export interface Technology { id: number; name: string; description: string; }

// Course
export interface Course { id: number; name: string; description: string; technologyId: number; durationInDays: number; }

// Stage
export interface Stage { id: number; name: string; description: string; courseId: number; order: number; }

// Trainer
export interface Trainer { id: number; userId: number; fullName: string; email: string; technologies?: Technology[]; }

// Associate
export interface Associate {
  id: number; userId: number; fullName: string; email: string;
  experienceLevel: string; currentBatchId?: number;
}

// Batch
export type BatchStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export interface Batch {
  id: number; name: string; description: string; status: BatchStatus;
  startDate: string; endDate: string; trainerId: number; trainerName?: string;
  capacity: number; enrollmentCount?: number;
}
export interface BatchDetails extends Batch { courses: Course[]; associates: Associate[]; }

// Enrollment
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'PENDING';
export interface Enrollment {
  id: number; associateId: number; batchId: number; status: EnrollmentStatus;
  enrollmentDate: string; associateName?: string; batchName?: string;
}

// Schedule
export interface Schedule {
  id: number; batchId: number; sessionDate: string; topic: string; batchName?: string;
}

// Assessment
export type AssessmentType = 'QUIZ' | 'INTERVIEW';
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export interface Assessment {
  id: number; title: string; type: AssessmentType; status: AssessmentStatus;
  batchId: number; batchName?: string; createdAt: string;
}

export interface QuizQuestion { id: number; question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; }
export interface Quiz extends Assessment { questions: QuizQuestion[]; durationMinutes: number; passingScore: number; }
export interface Interview extends Assessment { category: string; interviewDate: string; }
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
