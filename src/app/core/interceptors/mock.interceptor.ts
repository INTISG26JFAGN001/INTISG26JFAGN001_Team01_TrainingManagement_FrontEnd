import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

const MOCK_TOKEN = 'mock-jwt-token-12345';

const MOCK_USERS = [
  { id: 1, username: 'admin', fullName: 'Admin User', email: 'admin@tms.com', role: 'ROLE_ADMIN' },
  { id: 2, username: 'jsmith', fullName: 'John Smith', email: 'jsmith@tms.com', role: 'ROLE_TRAINER' },
  { id: 3, username: 'adoe', fullName: 'Alice Doe', email: 'adoe@tms.com', role: 'ROLE_ASSOCIATE' },
  { id: 4, username: 'bjones', fullName: 'Bob Jones', email: 'bjones@tms.com', role: 'ROLE_ASSOCIATE' },
  { id: 5, username: 'clead', fullName: 'Carol Lead', email: 'clead@tms.com', role: 'ROLE_TECH_LEAD' },
  { id: 6, username: 'dcoach', fullName: 'Dave Coach', email: 'dcoach@tms.com', role: 'ROLE_COACH' },
];

const MOCK_TECHNOLOGIES = [
  { id: 1, name: 'Java', description: 'Core Java and Spring Framework' },
  { id: 2, name: 'Angular', description: 'Frontend framework by Google' },
  { id: 3, name: 'React', description: 'UI library by Meta' },
  { id: 4, name: 'Python', description: 'General purpose programming language' },
  { id: 5, name: 'Docker', description: 'Container platform' },
  { id: 6, name: 'Kubernetes', description: 'Container orchestration' },
];

const MOCK_COURSES = [
  { id: 1, name: 'Java Fundamentals', description: 'Core Java concepts', technologyId: 1, durationInDays: 30 },
  { id: 2, name: 'Spring Boot Microservices', description: 'Build microservices with Spring Boot', technologyId: 1, durationInDays: 45 },
  { id: 3, name: 'Angular 16 Development', description: 'Modern Angular development', technologyId: 2, durationInDays: 25 },
  { id: 4, name: 'React Essentials', description: 'React fundamentals and hooks', technologyId: 3, durationInDays: 20 },
  { id: 5, name: 'Python for Data Science', description: 'Python with pandas and numpy', technologyId: 4, durationInDays: 35 },
];

const MOCK_STAGES = [
  { id: 1, name: 'Introduction', description: 'Basic concepts', courseId: 1, order: 1 },
  { id: 2, name: 'Core Concepts', description: 'Deep dive', courseId: 1, order: 2 },
  { id: 3, name: 'Advanced Topics', description: 'Advanced features', courseId: 1, order: 3 },
  { id: 4, name: 'Project Work', description: 'Hands-on project', courseId: 1, order: 4 },
];

const MOCK_TRAINERS = [
  { id: 1, userId: 2, fullName: 'John Smith', email: 'jsmith@tms.com', technologies: [{ id: 1, name: 'Java' }, { id: 2, name: 'Angular' }] },
  { id: 2, userId: 5, fullName: 'Carol Lead', email: 'clead@tms.com', technologies: [{ id: 3, name: 'React' }, { id: 4, name: 'Python' }] },
];

const MOCK_BATCHES = [
  { id: 1, name: 'Java Full Stack Q1 2026', description: 'Full stack Java batch', status: 'ONGOING', startDate: '2026-01-15', endDate: '2026-04-15', trainerId: 1, trainerName: 'John Smith', capacity: 25, enrollmentCount: 18 },
  { id: 2, name: 'Angular Development Q2 2026', description: 'Frontend Angular batch', status: 'UPCOMING', startDate: '2026-05-01', endDate: '2026-07-01', trainerId: 1, trainerName: 'John Smith', capacity: 20, enrollmentCount: 0 },
  { id: 3, name: 'Python Data Science Q4 2025', description: 'Data science batch', status: 'COMPLETED', startDate: '2025-10-01', endDate: '2025-12-31', trainerId: 2, trainerName: 'Carol Lead', capacity: 15, enrollmentCount: 14 },
  { id: 4, name: 'React & Node.js Batch', description: 'MERN stack development', status: 'ONGOING', startDate: '2026-02-01', endDate: '2026-05-01', trainerId: 2, trainerName: 'Carol Lead', capacity: 20, enrollmentCount: 12 },
  { id: 5, name: 'DevOps & Cloud Q3 2026', description: 'Docker, K8s, AWS', status: 'UPCOMING', startDate: '2026-07-01', endDate: '2026-09-30', trainerId: 1, trainerName: 'John Smith', capacity: 18, enrollmentCount: 0 },
];

const MOCK_ASSOCIATES = [
  { id: 1, userId: 3, fullName: 'Alice Doe', email: 'adoe@tms.com', experienceLevel: 'JUNIOR', currentBatchId: 1 },
  { id: 2, userId: 4, fullName: 'Bob Jones', email: 'bjones@tms.com', experienceLevel: 'MID', currentBatchId: 1 },
  { id: 3, userId: 7, fullName: 'Emma Wilson', email: 'ewilson@tms.com', experienceLevel: 'JUNIOR', currentBatchId: 4 },
  { id: 4, userId: 8, fullName: 'Frank Miller', email: 'fmiller@tms.com', experienceLevel: 'SENIOR', currentBatchId: null },
  { id: 5, userId: 9, fullName: 'Grace Lee', email: 'glee@tms.com', experienceLevel: 'MID', currentBatchId: 1 },
];

const MOCK_ENROLLMENTS = [
  { id: 1, associateId: 1, batchId: 1, status: 'ACTIVE', enrollmentDate: '2026-01-15', associateName: 'Alice Doe', batchName: 'Java Full Stack Q1 2026' },
  { id: 2, associateId: 2, batchId: 1, status: 'ACTIVE', enrollmentDate: '2026-01-15', associateName: 'Bob Jones', batchName: 'Java Full Stack Q1 2026' },
  { id: 3, associateId: 3, batchId: 4, status: 'ACTIVE', enrollmentDate: '2026-02-01', associateName: 'Emma Wilson', batchName: 'React & Node.js Batch' },
];

const MOCK_SCHEDULES = [
  { id: 1, batchId: 1, topic: 'Java OOP Fundamentals', sessionDate: '2026-01-20T09:00:00' },
  { id: 2, batchId: 1, topic: 'Spring Boot Basics', sessionDate: '2026-02-03T09:00:00' },
  { id: 3, batchId: 1, topic: 'REST API Design', sessionDate: '2026-02-17T09:00:00' },
  { id: 4, batchId: 1, topic: 'Microservices Architecture', sessionDate: '2026-03-10T09:00:00' },
];

const MOCK_ASSESSMENTS = [
  { id: 1, title: 'Java Basics Quiz', type: 'QUIZ', status: 'PUBLISHED', batchId: 1, createdAt: '2026-01-25' },
  { id: 2, title: 'Spring Boot Assessment', type: 'QUIZ', status: 'DRAFT', batchId: 1, createdAt: '2026-02-10' },
  { id: 3, title: 'Technical Interview Round 1', type: 'INTERVIEW', status: 'PUBLISHED', batchId: 1, createdAt: '2026-03-01' },
  { id: 4, title: 'React Fundamentals Quiz', type: 'QUIZ', status: 'PUBLISHED', batchId: 4, createdAt: '2026-02-15' },
  { id: 5, title: 'Final Technical Interview', type: 'INTERVIEW', status: 'DRAFT', batchId: 4, createdAt: '2026-03-20' },
];

const MOCK_PROJECTS = [
  { id: 1, title: 'E-Commerce Backend API', description: 'RESTful API for online store', batchId: 1, associateId: 1, submissionDate: '2026-03-20', repositoryUrl: 'https://github.com/example/ecommerce-api', associateName: 'Alice Doe' },
  { id: 2, title: 'Task Management App', description: 'Full stack task manager', batchId: 1, associateId: 2, submissionDate: '2026-03-22', repositoryUrl: 'https://github.com/example/task-manager', associateName: 'Bob Jones' },
  { id: 3, title: 'Social Media Dashboard', description: 'React-based dashboard', batchId: 4, associateId: 3, submissionDate: '2026-04-01', repositoryUrl: '', associateName: 'Emma Wilson' },
];

const MOCK_EVALUATIONS = [
  { id: 1, batchId: 1, associateId: 1, associateName: 'Alice Doe', totalScore: 87.5, quizScore: 90, interviewScore: 82, projectScore: 90 },
  { id: 2, batchId: 1, associateId: 2, associateName: 'Bob Jones', totalScore: 74.3, quizScore: 78, interviewScore: 68, projectScore: 77 },
  { id: 3, batchId: 1, associateId: 5, associateName: 'Grace Lee', totalScore: 92.1, quizScore: 95, interviewScore: 90, projectScore: 91 },
];

const MOCK_BATCH_DETAILS = {
  1: { ...MOCK_BATCHES[0], courses: [MOCK_COURSES[0], MOCK_COURSES[1]], associates: MOCK_ASSOCIATES.filter(a => a.currentBatchId === 1) },
  4: { ...MOCK_BATCHES[3], courses: [MOCK_COURSES[2], MOCK_COURSES[3]], associates: MOCK_ASSOCIATES.filter(a => a.currentBatchId === 4) },
};

function ok(body: any, delayMs = 300): Observable<HttpEvent<any>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(delayMs));
}

@Injectable()
export class MockInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { url, method, body } = req;
    const path = url.replace('http://localhost:8000', '');

    // ── Auth ──────────────────────────────────────────────────────────
    if (method === 'POST' && path === '/auth/login') {
      const { username, password } = body;
      if (password === 'pass' || password === '123') {
        const user = MOCK_USERS.find(u => u.username === username) ?? MOCK_USERS[0];
        return ok({ accessToken: MOCK_TOKEN, role: user.role, userId: user.id, username: user.username });
      }
      return of(new HttpResponse({ status: 401, body: { message: 'Invalid credentials' } }));
    }
    if (method === 'POST' && path === '/auth/signup') return ok({ message: 'User created' });

    // ── Users ─────────────────────────────────────────────────────────
    if (method === 'GET' && path === '/user/all') return ok(MOCK_USERS);
    if (method === 'GET' && path.startsWith('/user/') && !path.includes('?')) {
      const id = Number(path.split('/')[2]);
      return ok(MOCK_USERS.find(u => u.id === id) ?? MOCK_USERS[0]);
    }
    if (method === 'PUT' && path === '/user/update') return ok({ ...body });
    if (method === 'DELETE' && path.startsWith('/user/')) return ok({ message: 'Deleted' });

    // ── Technologies ─────────────────────────────────────────────────
    if (method === 'GET' && path === '/technologies') return ok(MOCK_TECHNOLOGIES);
    if (method === 'GET' && path.match(/^\/technologies\/\d+$/)) return ok(MOCK_TECHNOLOGIES[0]);
    if (method === 'POST' && path === '/technologies') return ok({ id: Date.now(), ...body });
    if (method === 'PUT' && path.match(/^\/technologies\/\d+$/)) return ok({ ...body });
    if (method === 'DELETE' && path.match(/^\/technologies\/\d+$/)) return ok({});

    // ── Courses ──────────────────────────────────────────────────────
    if (method === 'GET' && path === '/courses') return ok(MOCK_COURSES);
    if (method === 'GET' && path.match(/^\/courses\/\d+$/)) return ok(MOCK_COURSES[0]);
    if (method === 'POST' && path === '/courses') return ok({ id: Date.now(), ...body });
    if (method === 'PUT' && path.match(/^\/courses\/\d+$/)) return ok({ ...body });
    if (method === 'DELETE' && path.match(/^\/courses\/\d+$/)) return ok({});

    // ── Stages ───────────────────────────────────────────────────────
    if (method === 'GET' && path === '/stages') return ok(MOCK_STAGES);
    if (method === 'GET' && path.match(/^\/stages\/\d+$/)) return ok(MOCK_STAGES[0]);
    if (method === 'POST' && path === '/stages') return ok({ id: Date.now(), ...body });
    if (method === 'PUT' && path.match(/^\/stages\/\d+$/)) return ok({ ...body });
    if (method === 'DELETE' && path.match(/^\/stages\/\d+$/)) return ok({});

    // ── Trainers ─────────────────────────────────────────────────────
    if (method === 'GET' && path === '/trainer') return ok(MOCK_TRAINERS);
    if (method === 'GET' && path.match(/^\/trainer\/\d+$/)) return ok(MOCK_TRAINERS[0]);
    if (method === 'POST' && path === '/trainer') return ok({ id: Date.now(), ...body });
    if (method === 'DELETE' && path.match(/^\/trainer\/\d+$/)) return ok({});
    if (method === 'GET' && path.match(/^\/trainer\/\d+\/technologies$/)) return ok(MOCK_TECHNOLOGIES.slice(0, 2));
    if (method === 'PUT' && path.match(/^\/trainer\/\d+\/technologies$/)) return ok(MOCK_TRAINERS[0]);

    // ── Batches ──────────────────────────────────────────────────────
    if (method === 'GET' && path === '/batches') return ok(MOCK_BATCHES);
    if (method === 'GET' && path.match(/^\/batches\/\d+\/details$/)) {
      const id = Number(path.split('/')[2]);
      return ok((MOCK_BATCH_DETAILS as any)[id] ?? { ...MOCK_BATCHES[0], courses: MOCK_COURSES.slice(0, 2), associates: MOCK_ASSOCIATES.slice(0, 3) });
    }
    if (method === 'GET' && path.match(/^\/batches\/\d+\/courses$/)) return ok(MOCK_COURSES.slice(0, 2));
    if (method === 'GET' && path.match(/^\/batches\/\d+$/) && !path.includes('details')) {
      const id = Number(path.split('/')[2]);
      return ok(MOCK_BATCHES.find(b => b.id === id) ?? MOCK_BATCHES[0]);
    }
    if (method === 'GET' && path.startsWith('/batches/status')) {
      const status = req.params.get('status');
      return ok(MOCK_BATCHES.filter(b => b.status === status));
    }
    if (method === 'POST' && path === '/batches') return ok({ id: Date.now(), ...body, status: 'UPCOMING' });
    if (method === 'DELETE' && path.match(/^\/batches\/\d+$/)) return ok({});
    if (method === 'PUT' && path.match(/^\/batches\/\d+\/status$/)) {
      const id = Number(path.split('/')[2]);
      const b = MOCK_BATCHES.find(x => x.id === id) ?? MOCK_BATCHES[0];
      return ok({ ...b, status: req.params.get('status') });
    }

    // ── Associates ───────────────────────────────────────────────────
    if (method === 'GET' && path === '/associates') return ok(MOCK_ASSOCIATES);
    if (method === 'GET' && path.startsWith('/associates/batch')) return ok(MOCK_ASSOCIATES.slice(0, 3));
    if (method === 'GET' && path.match(/^\/associates\/\d+$/)) {
      const id = Number(path.split('/')[2]);
      return ok(MOCK_ASSOCIATES.find(a => a.userId === id) ?? MOCK_ASSOCIATES[0]);
    }
    if (method === 'POST' && path === '/associates/create') return ok({ id: Date.now(), ...body });
    if (method === 'PUT' && path === '/associates/update') return ok({ ...body });

    // ── Enrollments ──────────────────────────────────────────────────
    if (method === 'GET' && path === '/enrollment') return ok(MOCK_ENROLLMENTS);
    if (method === 'GET' && path.startsWith('/enrollment/batch')) return ok(MOCK_ENROLLMENTS.filter(e => e.batchId === Number(req.params.get('id'))));
    if (method === 'GET' && path.startsWith('/enrollment/associate')) return ok(MOCK_ENROLLMENTS.filter(e => e.associateId === Number(req.params.get('id'))));
    if (method === 'GET' && path.match(/^\/enrollment\/\d+$/)) return ok(MOCK_ENROLLMENTS[0]);
    if (method === 'POST' && path === '/enrollment') return ok({ id: Date.now(), ...body, status: 'ACTIVE', enrollmentDate: new Date().toISOString() });
    if (method === 'DELETE' && path.match(/^\/enrollment\/\d+$/)) return ok({});
    if (method === 'PUT' && path.match(/^\/enrollment\/\d+\/status$/)) return ok({ ...MOCK_ENROLLMENTS[0], status: req.params.get('val') });

    // ── Schedules ────────────────────────────────────────────────────
    if (method === 'GET' && path === '/schedule') return ok(MOCK_SCHEDULES);
    if (method === 'GET' && path.startsWith('/schedule/batch')) return ok(MOCK_SCHEDULES.filter(s => s.batchId === Number(req.params.get('id'))));
    if (method === 'GET' && path.match(/^\/schedule\/\d+$/)) return ok(MOCK_SCHEDULES[0]);
    if (method === 'POST' && path === '/schedule') return ok({ id: Date.now(), ...body });

    // ── Assessments ──────────────────────────────────────────────────
    if (method === 'GET' && path === '/assessments') return ok(MOCK_ASSESSMENTS);
    if (method === 'GET' && path.match(/^\/assessments\/batch\/\d+$/) && !path.includes('type') && !path.includes('status')) return ok(MOCK_ASSESSMENTS.filter(a => a.batchId === Number(path.split('/')[3])));
    if (method === 'GET' && path.match(/^\/assessments\/type\//)) return ok(MOCK_ASSESSMENTS.filter(a => a.type === path.split('/')[3]));
    if (method === 'GET' && path.match(/^\/assessments\/quiz\/batch\/\d+$/)) return ok(MOCK_ASSESSMENTS.filter(a => a.type === 'QUIZ' && a.batchId === Number(path.split('/')[4])));
    if (method === 'GET' && path.match(/^\/assessments\/interview\/batch\/\d+$/) && !path.includes('category')) return ok(MOCK_ASSESSMENTS.filter(a => a.type === 'INTERVIEW' && a.batchId === Number(path.split('/')[4])));
    if (method === 'GET' && path.match(/^\/assessments\/quiz\/\d+$/)) return ok({ ...MOCK_ASSESSMENTS[0], questions: [], durationMinutes: 30, passingScore: 60 });
    if (method === 'GET' && path.match(/^\/assessments\/interview\/\d+$/)) return ok({ ...MOCK_ASSESSMENTS[2], category: 'TECHNICAL', interviewDate: '2026-04-01' });
    if (method === 'POST' && path === '/assessments/quiz') return ok({ id: Date.now(), ...body, type: 'QUIZ', status: 'DRAFT', createdAt: new Date().toISOString() });
    if (method === 'POST' && path === '/assessments/interview') return ok({ id: Date.now(), ...body, type: 'INTERVIEW', status: 'DRAFT', createdAt: new Date().toISOString() });
    if (method === 'POST' && path.match(/^\/assessments\/interview\/\d+\/publish$/)) return ok({});
    if (method === 'PATCH' && path.match(/^\/assessments\/\d+$/)) return ok({ ...body });
    if (method === 'DELETE' && path.match(/^\/assessments\/\d+$/)) return ok({});
    if (method === 'GET' && path.match(/^\/assessments\/\d+\/rubrics$/)) return ok([{ id: 1, criteria: 'Code Quality', weight: 40, description: 'Clean, readable code' }, { id: 2, criteria: 'Functionality', weight: 60, description: 'All features working' }]);
    if (method === 'POST' && path.match(/^\/assessments\/\d+\/rubrics$/)) return ok({ id: Date.now(), ...body });
    if (method === 'DELETE' && path.match(/^\/assessments\/\d+\/rubrics\/\d+$/)) return ok({});

    // ── Projects ─────────────────────────────────────────────────────
    if (method === 'GET' && path === '/projects/getProjects') return ok(MOCK_PROJECTS);
    if (method === 'GET' && path.match(/^\/projects\/\d+$/)) return ok(MOCK_PROJECTS[0]);
    if (method === 'POST' && path === '/projects/submitProject') return ok({ id: Date.now(), ...body, submissionDate: new Date().toISOString() });
    if (method === 'PUT' && path.match(/^\/projects\/update\/\d+$/)) return ok({ ...body });
    if (method === 'DELETE' && path.match(/^\/projects\/delete\/\d+$/)) return ok({});
    if (method === 'GET' && path.match(/^\/reviews\/project\/\d+\/all$/)) return ok([{ id: 1, projectId: 1, reviewerId: 2, reviewerName: 'John Smith', score: 88, comments: 'Good work!', reviewDate: '2026-03-25' }]);
    if (method === 'POST' && path.match(/^\/reviews\/project\/\d+$/)) return ok({ id: Date.now(), ...body });
    if (method === 'PUT' && path.match(/^\/reviews\/\d+$/)) return ok({ ...body });

    // ── Evaluations ──────────────────────────────────────────────────
    if (method === 'GET' && path.match(/^\/evaluations\/batch\/\d+$/) && !path.includes('associate')) return ok(MOCK_EVALUATIONS);
    if (method === 'POST' && path.match(/^\/evaluations\/batch\/\d+\/calculate$/)) return ok(MOCK_EVALUATIONS);
    if (method === 'GET' && path.match(/^\/evaluations\/batch\/\d+\/associate\/\d+$/)) return ok(MOCK_EVALUATIONS[0]);

    // ── Pass through anything else ────────────────────────────────────
    return next.handle(req);
  }
}
