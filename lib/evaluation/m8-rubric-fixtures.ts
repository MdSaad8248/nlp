/**
 * lib/evaluation/m8-rubric-fixtures.ts
 *
 * Milestone 8-C — Rubric & Requirement Intelligence Test Fixtures
 * 16 comprehensive rubric evaluation scenarios covering:
 * - Standard rubrics & project guidelines
 * - Marks-based and percentage-based criteria
 * - Mandatory vs optional requirements
 * - Nested sub-criteria
 * - Multi-page rubric documents
 * - Scanned and OCR noisy rubrics
 * - Missing marks and unweighted requirements
 * - Malformed / unformatted rubric documents
 * - Task-to-requirement completion linking
 * - Grounded queries ("What requirements am I missing?", "Which part carries most marks?")
 */

export interface RubricScenario {
  id: string;
  name: string;
  category:
    | "STANDARD"
    | "GUIDELINES"
    | "MARKS_BASED"
    | "PERCENTAGE"
    | "OPTIONAL_BONUS"
    | "NESTED"
    | "MULTI_PAGE"
    | "OCR_NOISY"
    | "MISSING_MARKS"
    | "MALFORMED"
    | "LINKING"
    | "QUERY";
  rawText: string;
  completedItems?: string[];
  expected: {
    courseCode?: string;
    taskTitle?: string;
    minRequirements?: number;
    expectedTotalMarks?: number;
    expectedHighestMarkTitle?: string;
    expectedHighestMarks?: number;
    hasOptionalRequirements?: boolean;
    isMalformed?: boolean;
    query?: string;
    expectedCompletedCount?: number;
    expectedMissingCount?: number;
  };
}

export const M8_RUBRIC_SCENARIOS: RubricScenario[] = [
  // ── Scenario 1: Standard CSE4001 NLP Capstone Project Rubric ─────────────────
  {
    id: "RUBRIC-01",
    name: "CSE4001 NLP Capstone Project Rubric (6 Components, 100 Marks)",
    category: "STANDARD",
    rawText: `
CSE4001 — Natural Language Processing Capstone Project Rubric
Total Marks: 100

Requirements:
1. Literature Survey — 10 marks
2. Dataset — 10 marks
3. Methodology — 15 marks
4. Implementation — 25 marks
5. Evaluation — 20 marks
6. Presentation — 20 marks

Submission Guidelines:
- Upload report in IEEE format to VTOP before deadline.
    `,
    expected: {
      courseCode: "CSE4001",
      taskTitle: "Natural Language Processing Capstone Project Rubric",
      minRequirements: 6,
      expectedTotalMarks: 100,
      expectedHighestMarkTitle: "Implementation",
      expectedHighestMarks: 25,
      isMalformed: false,
    },
  },

  // ── Scenario 2: Project Guidelines with Checkboxes ──────────────────────────
  {
    id: "RUBRIC-02",
    name: "CSE3002 Machine Learning Project Guidelines (Checkboxes)",
    category: "GUIDELINES",
    rawText: `
CSE3002: Machine Learning Project Guidelines
Evaluation Criteria:
□ Problem Formulation & Data Exploration — 15 marks
□ Feature Engineering & Preprocessing — 15 marks
□ Model Architecture & Baselines — 20 marks
□ Hyperparameter Tuning & Cross Validation — 20 marks
□ Performance Analysis & ROC-AUC Evaluation — 20 marks
□ Project Report & Code Documentation — 10 marks
    `,
    expected: {
      courseCode: "CSE3002",
      minRequirements: 6,
      expectedTotalMarks: 100,
      isMalformed: false,
    },
  },

  // ── Scenario 3: Marks-Based OS Lab Rubric ───────────────────────────────────
  {
    id: "RUBRIC-03",
    name: "CSE2004 Operating Systems Lab Evaluation Rubric",
    category: "MARKS_BASED",
    rawText: `
CSE2004 Operating Systems Lab Report Rubric
Total: 100 marks

Marking Criteria:
1. System Call Architecture & Design (20 marks)
2. C Implementation of Kernel Module (40 marks)
3. Concurrency & Synchronization Testing (20 marks)
4. Viva Voce and Demonstration (20 marks)
    `,
    expected: {
      courseCode: "CSE2004",
      minRequirements: 4,
      expectedTotalMarks: 100,
      expectedHighestMarkTitle: "C Implementation of Kernel Module",
      expectedHighestMarks: 40,
      isMalformed: false,
    },
  },

  // ── Scenario 4: Percentage-Based Rubric ──────────────────────────────────────
  {
    id: "RUBRIC-04",
    name: "CSE3001 DBMS Project (Percentage Scheme)",
    category: "PERCENTAGE",
    rawText: `
CSE3001 Database Management Systems Project Rubric
Weightage Distribution:
- Project Proposal & ER Modeling — 10%
- Normalization to BCNF — 20%
- Complex SQL Queries & Triggers — 40%
- Application Frontend & Database Connectivity — 30%
    `,
    expected: {
      courseCode: "CSE3001",
      minRequirements: 4,
      isMalformed: false,
    },
  },

  // ── Scenario 5: Mandatory Requirements ──────────────────────────────────────
  {
    id: "RUBRIC-05",
    name: "CSE2001 Computer Networks Project (Strict Mandatory Clauses)",
    category: "STANDARD",
    rawText: `
CSE2001 Computer Networks Project Rubric
Total: 50 marks

Requirements:
1. Packet Sniffing & Protocol Analysis — 15 marks
2. Custom Socket Programming Implementation — 25 marks
3. Performance Benchmark & Throughput Plots — 10 marks

Note: Socket programming implementation is mandatory for all students.
    `,
    expected: {
      courseCode: "CSE2001",
      minRequirements: 3,
      expectedTotalMarks: 50,
      expectedHighestMarks: 25,
      isMalformed: false,
    },
  },

  // ── Scenario 6: Optional / Bonus Requirements ────────────────────────────────
  {
    id: "RUBRIC-06",
    name: "Project with Bonus/Optional Component",
    category: "OPTIONAL_BONUS",
    rawText: `
CSE3005 Artificial Intelligence Capstone Rubric
Maximum Marks: 100

Evaluation Components:
- A* Heuristic Search Implementation — 30 marks
- Alpha-Beta Pruning Game Engine — 40 marks
- Empirical Performance Comparison — 30 marks
- Docker Containerization & Cloud Deployment (Optional Bonus) — 10 marks
    `,
    expected: {
      courseCode: "CSE3005",
      minRequirements: 4,
      hasOptionalRequirements: true,
      isMalformed: false,
    },
  },

  // ── Scenario 7: Nested Sub-Criteria ──────────────────────────────────────────
  {
    id: "RUBRIC-07",
    name: "Deep Learning Project with Nested Sub-Requirements",
    category: "NESTED",
    rawText: `
CSE4002 Deep Learning Project Evaluation Scheme
Total Marks: 100

1. Dataset & Preprocessing — 20 marks
- Collect and annotate at least 1,000 images
- Implement data augmentation pipeline

2. Model Architecture & Training — 50 marks
- Implement ResNet or Vision Transformer in PyTorch
- Custom loss function and learning rate scheduler
- Multi-GPU distributed training

3. Evaluation & Ablation Study — 30 marks
- Confusion matrix and F1-score breakdown
- Qualitative failure cases analysis
    `,
    expected: {
      courseCode: "CSE4002",
      minRequirements: 3,
      expectedTotalMarks: 100,
      expectedHighestMarks: 50,
      isMalformed: false,
    },
  },

  // ── Scenario 8: Multi-Page Rubric Representation ────────────────────────────
  {
    id: "RUBRIC-08",
    name: "Multi-page Project Guideline and Marking Scheme",
    category: "MULTI_PAGE",
    rawText: `
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
Course: CSE3003 Software Engineering
Project Title: Agile Full-Stack Web Application Guidelines

\f
DETAILED EVALUATION CRITERIA

Requirements:
1. Requirements Specification & User Stories — 15 marks
2. Architectural Design & UML Diagrams — 20 marks
3. Full-Stack Implementation & REST APIs — 35 marks
4. Automated Unit Testing & CI/CD Pipeline — 20 marks
5. Final Sprint Demo & Code Review — 10 marks

\f
SUBMISSION INSTRUCTIONS
- Submit Git repository URL and PDF report through VTOP before October 15, 2026.
    `,
    expected: {
      courseCode: "CSE3003",
      minRequirements: 5,
      expectedTotalMarks: 100,
      isMalformed: false,
    },
  },

  // ── Scenario 9: Scanned OCR Rubric with Noise ────────────────────────────────
  {
    id: "RUBRIC-09",
    name: "OCR Scanned Project Rubric (Artifacts & Spacing Noise)",
    category: "OCR_NOISY",
    rawText: `
| CSE4001 - NLP Project Rubric |
Total Marks : 100

1. Literature Survey - 10 marks
2. Dataset Collection - 10 marks
3. Methodology & Design - 15 marks
4. Model Implementation - 25 marks
5. Experimental Evaluation - 20 marks
6. Final Presentation - 20 marks
    `,
    expected: {
      courseCode: "CSE4001",
      minRequirements: 6,
      expectedTotalMarks: 100,
      expectedHighestMarks: 25,
      isMalformed: false,
    },
  },

  // ── Scenario 10: Noisy OCR with Irregular Bullets ────────────────────────────
  {
    id: "RUBRIC-10",
    name: "Noisy OCR Rubric with Non-standard Bullet Points",
    category: "OCR_NOISY",
    rawText: `
ECE3001 Internet of Things Project Evaluation
Total: 50 marks

• Sensor Interfacing & Circuit Design — 15 marks
• Microcontroller Firmware Programming — 20 marks
• MQTT Cloud Telemetry & Dashboard — 15 marks
    `,
    expected: {
      courseCode: "ECE3001",
      minRequirements: 3,
      expectedTotalMarks: 50,
      isMalformed: false,
    },
  },

  // ── Scenario 11: Missing Marks / Unweighted Rubric ───────────────────────────
  {
    id: "RUBRIC-11",
    name: "Checklist Rubric Without Numerical Marks",
    category: "MISSING_MARKS",
    rawText: `
MAT2001 Applied Statistics Project Checklist
Requirements:
□ State Null and Alternative Hypotheses
□ Collect Sample Dataset and Check Normality
□ Perform ANOVA or Chi-Square Test
□ Interpret P-values and Formulate Conclusion
□ Submit Written Statistical Report
    `,
    expected: {
      courseCode: "MAT2001",
      minRequirements: 5,
      isMalformed: false,
    },
  },

  // ── Scenario 12: Malformed Document (Unstructured Text) ─────────────────────
  {
    id: "RUBRIC-12",
    name: "Malformed Document: Narrative Paragraph Without Criteria",
    category: "MALFORMED",
    rawText: `
Welcome to the course project. Students should form teams of three and work on an innovative topic.
Make sure to submit everything on time and consult the course instructor during office hours.
Plagiarism will result in severe penalties according to university policy.
    `,
    expected: {
      isMalformed: true,
      minRequirements: 0,
    },
  },

  // ── Scenario 13: Multiple Project Phases / Sections ──────────────────────────
  {
    id: "RUBRIC-13",
    name: "Two-Phase Project Rubric (Phase 1 & Phase 2)",
    category: "STANDARD",
    rawText: `
CSE4001 Natural Language Processing
Phase 1 and Phase 2 Evaluation Scheme

Phase 1 Deliverables:
1. Literature Survey — 10 marks
2. Dataset & Annotation — 15 marks

Phase 2 Deliverables:
3. Model Architecture & Implementation — 35 marks
4. Evaluation & Error Analysis — 25 marks
5. Viva & Project Report — 15 marks
    `,
    expected: {
      courseCode: "CSE4001",
      minRequirements: 5,
      expectedTotalMarks: 100,
      isMalformed: false,
    },
  },

  // ── Scenario 14: Task Linking & Completion Status Verification ──────────────
  {
    id: "RUBRIC-14",
    name: "Task Linking: Literature Survey and Dataset Completed",
    category: "LINKING",
    rawText: `
CSE4001 Natural Language Processing Project Rubric
Total Marks: 100

1. Literature Survey — 10 marks
2. Dataset — 10 marks
3. Methodology — 15 marks
4. Implementation — 25 marks
5. Evaluation — 20 marks
6. Presentation — 20 marks
    `,
    completedItems: ["Literature Survey", "Dataset"],
    expected: {
      courseCode: "CSE4001",
      expectedCompletedCount: 2,
      expectedMissingCount: 4,
      isMalformed: false,
    },
  },

  // ── Scenario 15: Grounded Query — "What requirements am I missing?" ─────────
  {
    id: "RUBRIC-15",
    name: "Query: 'What requirements am I missing for my NLP project?'",
    category: "QUERY",
    rawText: `
CSE4001 NLP Capstone Project Rubric
1. Literature Survey — 10 marks
2. Dataset — 10 marks
3. Methodology — 15 marks
4. Implementation — 25 marks
5. Evaluation — 20 marks
6. Presentation — 20 marks
    `,
    completedItems: ["Literature Survey", "Dataset"],
    expected: {
      query: "What requirements am I missing for my NLP project?",
      expectedMissingCount: 4,
      isMalformed: false,
    },
  },

  // ── Scenario 16: Grounded Query — "Which part of the rubric carries the most marks?" ─
  {
    id: "RUBRIC-16",
    name: "Query: 'Which part of the rubric carries the most marks?'",
    category: "QUERY",
    rawText: `
CSE4001 NLP Capstone Project Rubric
1. Literature Survey — 10 marks
2. Dataset — 10 marks
3. Methodology — 15 marks
4. Implementation — 25 marks
5. Evaluation — 20 marks
6. Presentation — 20 marks
    `,
    expected: {
      query: "Which part of the rubric carries the most marks?",
      expectedHighestMarkTitle: "Implementation",
      expectedHighestMarks: 25,
      isMalformed: false,
    },
  },
];
