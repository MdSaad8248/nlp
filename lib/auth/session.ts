// Role-based User Session Definitions for Students & Faculty

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER";
  rollNumber: string; // Roll number for students, Faculty Employee ID for teachers
  department?: string;
  program: string;
  semester?: number;
  badge?: string;
  assignedCourses?: string[]; // course codes managed by teacher
}

export type StudentUserSession = UserSession;

export const DEMO_STUDENTS: UserSession[] = [
  {
    id: "student-academic-demo-01",
    name: "Saad (Student A)",
    email: "saad@academic.ai",
    role: "STUDENT",
    rollNumber: "21BDS0142",
    program: "B.Tech Data Science (Year 4)",
    semester: 8,
    badge: "NLP / Heavy Workload",
  },
  {
    id: "student-academic-demo-02",
    name: "Priya Sharma (Student B)",
    email: "priya@academic.ai",
    role: "STUDENT",
    rollNumber: "22BCS0218",
    program: "B.Tech Computer Science (Year 3)",
    semester: 6,
    badge: "ML / Moderate Workload",
  },
  {
    id: "student-academic-demo-03",
    name: "Arjun Verma (Student C)",
    email: "arjun@academic.ai",
    role: "STUDENT",
    rollNumber: "23BIT0094",
    program: "B.Tech Information Technology (Year 2)",
    semester: 4,
    badge: "Networks / Clear Slate",
  },
];

export const DEMO_TEACHERS: UserSession[] = [
  {
    id: "faculty-academic-demo-01",
    name: "Dr. P. Raman",
    email: "faculty.raman@academic.ai",
    role: "TEACHER",
    rollNumber: "FAC-NLP-01",
    department: "Department of AI and Data Science",
    program: "Faculty of Computer Engineering",
    badge: "Course Lead: CSE4001 NLP",
    assignedCourses: ["CSE4001"],
  },
  {
    id: "faculty-academic-demo-02",
    name: "Dr. S. Kulkarni",
    email: "faculty.kulkarni@academic.ai",
    role: "TEACHER",
    rollNumber: "FAC-ML-02",
    department: "Department of Computer Science",
    program: "Faculty of Computing",
    badge: "Course Lead: CSE3002 ML",
    assignedCourses: ["CSE3002"],
  },
  {
    id: "faculty-academic-demo-03",
    name: "Dr. K. Swaminathan",
    email: "faculty.swaminathan@academic.ai",
    role: "TEACHER",
    rollNumber: "FAC-OS-03",
    department: "Department of Software Systems",
    program: "Faculty of Systems Engineering",
    badge: "Course Lead: CSE2004 OS",
    assignedCourses: ["CSE2004"],
  },
];

export const ALL_DEMO_USERS: UserSession[] = [...DEMO_STUDENTS, ...DEMO_TEACHERS];

export const DEFAULT_STUDENT_SESSION: UserSession = DEMO_STUDENTS[0];
export const DEFAULT_TEACHER_SESSION: UserSession = DEMO_TEACHERS[0];

// In-memory fallback for current active session
let _activeSessionId: string = DEFAULT_STUDENT_SESSION.id;

export function setActiveSessionId(userId: string) {
  const found = ALL_DEMO_USERS.find(
    (s) => s.id === userId || s.email === userId || s.rollNumber === userId
  );
  if (found) {
    _activeSessionId = found.id;
  }
}

export function getCurrentSession(cookieUserId?: string | null): UserSession {
  const targetId = cookieUserId || _activeSessionId;
  const match = ALL_DEMO_USERS.find(
    (s) => s.id === targetId || s.email === targetId || s.rollNumber === targetId
  );
  return match || DEFAULT_STUDENT_SESSION;
}
