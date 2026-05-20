import { Component } from '@angular/core';

interface FaqItem {
  question: string;
  answer: string;
  open: boolean;
}

@Component({
  selector: 'app-helpdesk',
  templateUrl: './helpdesk.component.html',
  styleUrls: ['./helpdesk.component.scss']
})
export class HelpdeskComponent {
  faqs: FaqItem[] = [
    {
      question: 'How do I reset my password?',
      answer: 'You can reset your password by clicking "Forgot Password" on the login page. A reset link will be sent to your registered email address. If you don\'t receive it within a few minutes, check your spam folder or contact your administrator.',
      open: true
    },
    {
      question: 'How can I view my assigned batch and schedule?',
      answer: 'Once logged in, navigate to "My Learning" from the sidebar and select "My Schedules". This will display your assigned batch, training timelines, and upcoming sessions.',
      open: false
    },
    {
      question: 'How do I submit my project for review?',
      answer: 'Go to "My Learning" → "My Projects" from the sidebar. Find your assigned project and click the "Submit" button. Make sure to attach all required deliverables before submitting.',
      open: false
    },
    {
      question: 'Why can\'t I access certain sections of the platform?',
      answer: 'Access to sections is role-based. Associates, Trainers, Admins, and other roles have different permissions. If you believe you need access to a specific section, please contact your administrator to update your role.',
      open: false
    },
    {
      question: 'How do I contact my trainer or administrator?',
      answer: 'You can reach your trainer or administrator through the internal messaging system or by using the contact details provided during your onboarding. For urgent issues, please email support@skillsync.com.',
      open: false
    }
  ];

  toggle(faq: FaqItem): void {
    faq.open = !faq.open;
  }
}
