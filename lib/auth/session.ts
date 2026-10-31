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
  {
    id: "faculty-academic-demo-04",
    name: "Prof. M. Verma",
    email: "faculty.verma@academic.ai",
    role: "TEACHER",
    rollNumber: "FAC-CN-04",
    department: "Department of Network Systems",
    program: "Faculty of Telecommunications",
    badge: "Course Lead: CSE2001 CN",
    assignedCourses: ["CSE2001"],
  },
  {
    id: "faculty-academic-demo-05",
    name: "Dr. K. Senthil",
    email: "faculty.senthil@academic.ai",
    role: "TEACHER",
    rollNumber: "FAC-DB-05",
    department: "Department of Database Engineering",
    program: "Faculty of Computing",
    badge: "Course Lead: CSE3001 DB",
    assignedCourses: ["CSE3001"],
  },
  {
    id: "faculty-academic-demo-06",
    name: "Dr. A. Sharma",
    email: "faculty.sharma@academic.ai",
    role: "TEACHER",
    rollNumber: "FAC-STAT-06",
    department: "Department of Mathematics & Statistics",
    program: "Faculty of Basic Sciences",
    badge: "Course Lead: MAT2001 STAT",
    assignedCourses: ["MAT2001"],
  },
];

export const ALL_DEMO_USERS: UserSession[] = [...DEMO_STUDENTS, ...DEMO_TEACHERS];

export const DEFAULT_STUDENT_SESSION: UserSession = DEMO_STUDENTS[0];
export const DEFAULT_TEACHER_SESSION: UserSession = DEMO_TEACHERS[0];

// In-memory cache for dynamic & database sessions
const _sessionCache = new Map<string, UserSession>();

// In-memory fallback for current active session
let _activeSessionId: string = DEFAULT_STUDENT_SESSION.id;

export function registerUserSession(session: UserSession) {
  _sessionCache.set(session.id, session);
  if (session.email) _sessionCache.set(session.email, session);
  if (session.rollNumber) _sessionCache.set(session.rollNumber, session);
  _activeSessionId = session.id;
}

export function setActiveSessionId(userId: string) {
  const found = ALL_DEMO_USERS.find(
    (s) => s.id === userId || s.email === userId || s.rollNumber === userId
  ) || _sessionCache.get(userId);

  if (found) {
    _activeSessionId = found.id;
    if (typeof document !== "undefined") {
      try {
        document.cookie = `academic_student_id=${encodeURIComponent(found.id)}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `academic_user_role=${encodeURIComponent(found.role)}; path=/; max-age=604800; SameSite=Lax`;
      } catch {
        // ignore
      }
    }
  }
}

export function getCurrentSession(cookieUserId?: string | null): UserSession {
  const targetId = cookieUserId || _activeSessionId;
  if (!targetId) return DEFAULT_STUDENT_SESSION;

  if (_sessionCache.has(targetId)) {
    return _sessionCache.get(targetId)!;
  }

  const match = ALL_DEMO_USERS.find(
    (s) => s.id === targetId || s.email === targetId || s.rollNumber === targetId
  );
  if (match) return match;

  if (targetId.startsWith("faculty-") || targetId.startsWith("FAC-")) {
    return DEFAULT_TEACHER_SESSION;
  }

  return DEFAULT_STUDENT_SESSION;
}

export function getClientCookieSession(): UserSession {
  if (typeof document !== "undefined") {
    try {
      const roleMatch = document.cookie.match(/(?:^|;\s*)academic_user_role=([^;]*)/);
      const explicitRole = roleMatch ? decodeURIComponent(roleMatch[1]) : null;

      const match = document.cookie.match(/(?:^|;\s*)academic_student_id=([^;]*)/);
      if (match && match[1]) {
        const id = decodeURIComponent(match[1]);
        const matchUser =
          ALL_DEMO_USERS.find(
            (s) => s.id === id || s.email === id || s.rollNumber === id
          ) || _sessionCache.get(id);
        if (matchUser) {
          // If explicit role is set, ensure it matches
          if (!explicitRole || matchUser.role === explicitRole) {
            return matchUser;
          }
        }
      }

      // Check role cookie if ID didn't match directly or role was TEACHER
      if (explicitRole === "TEACHER") {
        return DEFAULT_TEACHER_SESSION;
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_STUDENT_SESSION;
}

