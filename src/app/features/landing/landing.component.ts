import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  activeUseCase = 0;

  useCases = [
    { label: 'Onboarding', icon: 'person_add', desc: 'Streamline new hire onboarding with automated training paths, progress tracking, and completion certificates.' },
    { label: 'Employee Enrollment', icon: 'how_to_reg', desc: 'Easily enroll employees into batches, assign trainers and track their learning journey end-to-end.' },
    { label: 'Compliance Training', icon: 'verified_user', desc: 'Ensure all associates complete mandatory compliance modules with automated reminders and audit reports.' },
    { label: 'Customer Education', icon: 'school', desc: 'Deliver product training to customers with self-paced courses, quizzes and certifications.' },
    { label: 'Partner Enablement', icon: 'handshake', desc: 'Train partner networks and resellers with dedicated portals, role-based content and performance tracking.' },
    { label: 'Sell Your Courses', icon: 'sell', desc: 'Monetize your training content by publishing courses to external learners through the SkillSync marketplace.' },
  ];

  features = [
    { title: 'Personalized Upskilling', desc: 'Assign tailored learning paths to each associate based on their role, experience level and skill gaps.', icon: 'trending_up', img: 'chart' },
    { title: 'Integrations and API', desc: 'Connect SkillSync with your HR systems, Slack, JIRA and 50+ tools via our open REST API.', icon: 'api', img: 'api' },
    { title: 'AI/Score Ready', desc: 'Auto-grade quizzes, score interview rubrics and calculate final evaluations in seconds with AI assistance.', icon: 'psychology', img: 'ai' },
    { title: 'Report on Compliance and ROI', desc: 'Generate detailed compliance reports, track ROI on training spend and export data to PDF or Excel.', icon: 'bar_chart', img: 'report' },
  ];

  stats = [
    { value: '500+', label: 'Organizations' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '20+', label: 'Integrations' },
  ];

  partners = ['Cognizant', 'Capgemini', 'Infosys', 'Deloitte', 'IBM', 'Accenture'];

  constructor(private router: Router) {}

  goToLogin(): void { this.router.navigate(['/auth/login']); }
  goToDemo(): void { this.router.navigate(['/auth/login']); }
}
