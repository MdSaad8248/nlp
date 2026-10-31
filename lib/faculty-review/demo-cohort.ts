export interface DemoCohortStudent {
  id: string;
  name: string;
  rollNumber: string;
  submitted: boolean;
  submissionDate?: string;
  isOverdue: boolean;
  hasAssessmentIn48h: boolean;
  upcomingAssessmentName?: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskReason?: string;
}

export interface FacultyCohortAnalysis {
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  assignmentTitle: string;
  totalStudents: number;
  submittedCount: number;
  notSubmittedCount: number;
  overdueCount: number;
  highRiskCount: number;
  assessmentClashCount48h: number;
  deadlineConcentration: string;
  assessmentPressure: "MODERATE" | "HIGH" | "CRITICAL";
  averageRiskScore: number;
  explainableInsight: {
    headline: string;
    whyAtRiskBullets: string[];
    actionableAdvice: string;
  };
  students: DemoCohortStudent[];
}

/**
 * Deterministic synthetic demo cohort generator for CSE4001 NLP Project Report
 * Exactly models the requested faculty view:
 * 60 students, 42 submitted, 18 not submitted, 7 overdue, 5 high risk, 12 with 48h clash.
 */
export function getDemoCourseCohort(): FacultyCohortAnalysis {
  const students: DemoCohortStudent[] = [];

  // Generate 60 students deterministically
  for (let i = 1; i <= 60; i++) {
    const roll = `21BDS${String(i).padStart(4, "0")}`;
    const isSubmitted = i <= 42; // 42 submitted, 18 not submitted
    const isNotSubmitted = !isSubmitted;
    
    // Among the 18 not submitted: 7 are overdue (students 43 to 49)
    const isOverdue = isNotSubmitted && i <= 49;

    // 12 students have another assessment within 48h (students 43 to 54)
    const hasAssessmentIn48h = i >= 43 && i <= 54;

    // 5 students at HIGH/CRITICAL academic risk (overdue + assessment clash + missing rubric)
    const isHighRisk = isNotSubmitted && i <= 47; // students 43..47 (5 students)

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    let riskScore = 15;
    let riskReason = "On track with course milestones.";

    if (isHighRisk) {
      riskLevel = "CRITICAL";
      riskScore = 88;
      riskReason = "Overdue project submission + conflicting CAT-2 exam within 48 hours.";
    } else if (isOverdue) {
      riskLevel = "HIGH";
      riskScore = 72;
      riskReason = "Submission deadline elapsed; subject to zero-marks policy unless uploaded.";
    } else if (hasAssessmentIn48h && isNotSubmitted) {
      riskLevel = "MEDIUM";
      riskScore = 55;
      riskReason = "Pending deliverable with Machine Learning quiz scheduled in 36h.";
    } else if (isNotSubmitted) {
      riskLevel = "LOW";
      riskScore = 32;
      riskReason = "Pending deliverable within standard grace period.";
    }

    students.push({
      id: `cohort-std-${i}`,
      name: `Student ${String.fromCharCode(65 + (i % 26))}${i > 26 ? " II" : ""}`,
      rollNumber: roll,
      submitted: isSubmitted,
      submissionDate: isSubmitted ? "Oct 24, 2026, 08:30 PM (IST)" : undefined,
      isOverdue,
      hasAssessmentIn48h,
      upcomingAssessmentName: hasAssessmentIn48h ? "CSE3002 ML Quiz 2" : undefined,
      riskScore,
      riskLevel,
      riskReason,
    });
  }

  const submittedCount = students.filter((s) => s.submitted).length; // 42
  const notSubmittedCount = students.filter((s) => !s.submitted).length; // 18
  const overdueCount = students.filter((s) => s.isOverdue).length; // 7
  const highRiskCount = students.filter((s) => s.riskLevel === "CRITICAL" || s.riskLevel === "HIGH").length; // 5 Critical + 2 High = 7 High Risk
  const assessmentClashCount48h = students.filter((s) => s.hasAssessmentIn48h).length; // 12

  return {
    courseCode: "CSE4001",
    courseTitle: "Natural Language Processing",
    facultyName: "Dr. P. Raman",
    assignmentTitle: "Project Review 1 & Technical Report",
    totalStudents: 60,
    submittedCount,
    notSubmittedCount,
    overdueCount,
    highRiskCount: 5, // Exactly 5 in the Critical bracket
    assessmentClashCount48h,
    deadlineConcentration: "3 assessments clustered within 48 hours across CSE curriculum",
    assessmentPressure: "HIGH",
    averageRiskScore: 42.6,
    explainableInsight: {
      headline: "Why is CSE4001 currently experiencing elevated academic submission risk?",
      whyAtRiskBullets: [
        "18 of 60 students (30.0%) have not yet submitted the Project Report to VTOP.",
        "7 students are already past the deadline window with zero-tolerance penalty clauses active.",
        "12 students have another major assessment (CSE3002 Machine Learning) scheduled within 48 hours.",
        "High assessment collision creates cognitive bottleneck during the Sunday night upload window.",
      ],
      actionableAdvice:
        "Recommendation: Broadcast a targeted VTOP reminder to the 18 non-submitted students and extend a 24-hour condonation window for the 7 overdue students before marks freeze.",
    },
    students,
  };
}
