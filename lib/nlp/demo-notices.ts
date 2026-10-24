import { NoticeCategory } from "./schemas";

export interface DemoNotice {
  id: string;
  label: string;
  expectedCategory: NoticeCategory;
  description: string;
  text: string;
}

export const DEMO_NOTICES: DemoNotice[] = [
  {
    id: "demo-assignment-1",
    label: "NLP Assignment 2 (VTOP)",
    expectedCategory: "ASSIGNMENT",
    description: "Standard programming assignment with strict deadline and platform",
    text: `Dear Students,
The Assignment 2 for CSE4001 Natural Language Processing has been posted on VTOP.
All students must submit their Python Jupyter Notebook solutions through VTOP before September 24, 2026 at 11:59 PM.
Late submissions will not be accepted under any circumstances. Total marks: 20.`,
  },
  {
    id: "demo-quiz-1",
    label: "ML Online Quiz 1",
    expectedCategory: "QUIZ",
    description: "Scheduled Moodle MCQ quiz assessment",
    text: `Announcement for CSE3002 Machine Learning:
Online Quiz 1 on Supervised Learning Algorithms is scheduled for September 25, 2026 at 06:00 PM on Moodle.
The quiz contains 30 MCQs with a 45-minute duration. Total marks: 15. Make sure you have stable internet.`,
  },
  {
    id: "demo-exam-1",
    label: "Networks CAT-1 Exam",
    expectedCategory: "EXAM",
    description: "Continuous assessment test with venue and hall ticket requirements",
    text: `Office of Examinations - CAT-1 Schedule:
The CAT-1 continuous assessment test for CSE2001 Computer Networks will be held on October 05, 2026 from 10:00 AM to 11:30 AM in SJT 402.
Students must bring their printed hall ticket and university ID card. No electronic gadgets permitted.`,
  },
  {
    id: "demo-review-1",
    label: "NLP Project Review 1",
    expectedCategory: "REVIEW",
    description: "Capstone/mini project viva and review session shifted",
    text: `CSE4001 Natural Language Processing:
The NLP project review 1 has been shifted to Monday at 3 PM in SJT 402.
Each team will be given 10 minutes for PPT presentation and code demonstration. Attendance is mandatory for all team members.`,
  },
  {
    id: "demo-deadline-change",
    label: "DBMS Project Extension",
    expectedCategory: "PROJECT",
    description: "Project deliverable deadline transition with old and new dates",
    text: `Attention CSE3001 Database Management Systems students:
The Mini Project implementation deadline has been extended from September 18, 2026 to September 28, 2026 before 11:59 PM.
Submit your GitHub repository link and project report through VTOP. No further extensions will be permitted.`,
  },
  {
    id: "demo-cancellation-1",
    label: "Statistics Class Cancelled",
    expectedCategory: "CLASS_CANCELLATION",
    description: "Faculty leave and lecture cancellation notice",
    text: `Dear Students of MAT2001 Applied Statistics:
Please note that our lecture scheduled for tomorrow is cancelled as the faculty is on leave to attend an international conference.
Enjoy your morning! Compensatory schedule will be intimated later.`,
  },
  {
    id: "demo-reschedule-1",
    label: "OS Lecture Rescheduled",
    expectedCategory: "CLASS_CHANGE",
    description: "Class timing and classroom relocation",
    text: `CSE2004 Operating Systems:
The Thursday morning lecture has been rescheduled to Friday at 3 PM and relocated to TT 105.
We will cover Virtual Memory and Paging in this session. Please bring your textbook.`,
  },
  {
    id: "demo-attendance-1",
    label: "AI Attendance Shortage Warning",
    expectedCategory: "ATTENDANCE_NOTICE",
    description: "Attendance percentage warning and debarment notice",
    text: `School of Computer Science - Attendance Warning:
Students with attendance shortage below 75% in CSE3005 Artificial Intelligence are marked as defaulters.
Ineligible students will be debarred from writing CAT-1 unless condonation is obtained from the department proctor before Friday.`,
  },
  {
    id: "demo-event-1",
    label: "Generative AI Guest Lecture",
    expectedCategory: "EVENT",
    description: "Departmental guest lecture in auditorium",
    text: `The Department of Computer Science invites all students to a Guest Lecture on "Foundations of Large Language Models".
Date: October 02, 2026 at 02:00 PM in Anna Auditorium.
Keynote speaker: Dr. Arvind Ramanathan from AI Research Labs. Register through Google Classroom before September 30.`,
  },
  {
    id: "demo-marks-weightage",
    label: "Deep Learning Lab Weightage",
    expectedCategory: "ASSIGNMENT",
    description: "Deliverable with explicit percentage weightage and total marks",
    text: `CSE4002 Deep Learning Lab:
Experiment 5 Report on Convolutional Neural Networks carries 20% weightage, total 50 marks.
Upload your report and weights file to Moodle before September 26, 2026 at 11:59 PM. Marks will be deducted for delayed submissions.`,
  },
  {
    id: "demo-conditional-1",
    label: "DSA Defaulters Notice",
    expectedCategory: "ASSIGNMENT",
    description: "Conditional submission window for students who have not submitted",
    text: `CSE2002 Data Structures and Algorithms:
Final reminder for students who have not submitted Assignment 1 on Graph Traversals.
A penalty submission window is opened on VTOP until Sunday 11:59 PM. Zero marks will be awarded if not submitted by this final deadline.`,
  },
  {
    id: "demo-mixed-1",
    label: "ML Assignment + CAT-2 Notice",
    expectedCategory: "ASSIGNMENT",
    description: "Mixed announcement containing both an assignment deadline and upcoming exam date",
    text: `CSE3002 Machine Learning:
Assignment 3 solutions must be uploaded to VTOP before September 29, 2026 at 11:59 PM.
Also note that the CAT-2 exam has been scheduled for October 12, 2026 from 10:00 AM to 11:30 AM in SJT 402. Hall tickets will be issued next week.`,
  },
  {
    id: "demo-mixed-2",
    label: "Class Swap + Compensatory Lecture",
    expectedCategory: "CLASS_CHANGE",
    description: "Cancellation today and rescheduled compensatory lecture on Monday",
    text: `Attention CSE4001 NLP:
No class will be held today due to faculty meeting.
A compensatory extra class has been rescheduled for next Monday at 10:00 AM in CDMM 101. Attendance is mandatory for all enrolled students.`,
  },
  {
    id: "demo-circular-1",
    label: "Registrar Official Circular",
    expectedCategory: "CIRCULAR",
    description: "Formal university administration memorandum",
    text: `Office of the Registrar - Official Circular Ref: VIT/RO/2026/CIR-88:
All heads of departments and undergraduate students are hereby notified that the Course Registration Portal for the Winter Semester will open on October 15, 2026.
Ensure fee clearance with the finance office prior to registration.`,
  },
  {
    id: "demo-relative-time",
    label: "NLP Evening Submission",
    expectedCategory: "ASSIGNMENT",
    description: "Relative temporal expression: by tomorrow evening before 8 PM",
    text: `Reminder for CSE4001 Natural Language Processing:
All project abstracts must be submitted by tomorrow evening before 8 PM on Microsoft Teams.
Students who have not submitted by the deadline will face mark deductions.`,
  },
  {
    id: "demo-general-1",
    label: "Campus Network Maintenance",
    expectedCategory: "GENERAL_ANNOUNCEMENT",
    description: "General infrastructure notice without course deliverable",
    text: `University IT Services Announcement:
The campus Wi-Fi network and VTOP servers will undergo scheduled maintenance on Sunday from 01:00 AM to 05:00 AM.
Services may be intermittent during this window. Please plan your online academic activities accordingly.`,
  },
];
