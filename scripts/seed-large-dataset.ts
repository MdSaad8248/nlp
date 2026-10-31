/**
 * seed-large-dataset.ts
 *
 * Idempotent, production-quality seeding system for AcademicAI:
 * - 75 Synthetic Students (expandable up to 100 via SEED_STUDENT_COUNT=100)
 * - 6 Faculty Accounts with specific course leads
 * - 6 Core Academic Courses
 * - Multi-course enrollments per student
 * - Course-specific Syllabi and Rubrics
 * - Realistic Tasks, Submissions, and Progress entries
 *
 * Safe to rerun repeatedly: uses upserts and checks existing records.
 * Never deletes or wipes existing user records or valid data.
 */

import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/password";

const STUDENT_COUNT = parseInt(process.env.SEED_STUDENT_COUNT || "75", 10);

const FIRST_NAMES = [
  "Aarav", "Aditi", "Aditya", "Akash", "Ananya", "Aniket", "Ankita", "Arjun",
  "Aryan", "Avani", "Bhavya", "Chetan", "Deepak", "Devansh", "Diya", "Gaurav",
  "Harsh", "Ishaan", "Isha", "Karan", "Kavya", "Khushi", "Kunal", "Manish",
  "Meera", "Mohit", "Neha", "Nikhil", "Nisha", "Parth", "Pooja", "Pranav",
  "Prerna", "Rahul", "Rhea", "Rishabh", "Riya", "Rohan", "Sachi", "Sahil",
  "Sameer", "Sanjay", "Sanya", "Shaurya", "Shreya", "Siddharth", "Simran", "Sneha",
  "Soham", "Tanvi", "Tarun", "Utkarsh", "Vaishnavi", "Varun", "Vedant", "Vidhi",
  "Vihan", "Vikram", "Yash", "Yuvraj", "Zoya", "Alok", "Aman", "Amrita",
  "Anirudh", "Archana", "Ashwin", "Chandran", "Divya", "Gayatri", "Jatin", "Karthik",
  "Madhav", "Nandini", "Pallavi", "Pawan", "Radhika", "Rajesh", "Sakshi", "Sunil"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Kumar",
  "Singh", "Mehta", "Joshi", "Bhat", "Deshmukh", "Kulkarni", "Chopra", "Saxena",
  "Rao", "Menon", "Pillai", "Das", "Banerjee", "Chatterjee", "Bose", "Ghosh",
  "Mishra", "Pandey", "Trivedi", "Shukla", "Agrawal", "Jain", "Bhattacharya", "Sengupta"
];

const PROGRAMS = [
  "B.Tech Computer Science and Engineering",
  "B.Tech Data Science & Artificial Intelligence",
  "B.Tech Information Technology",
  "B.Tech Software Engineering",
];

async function main() {
  console.log("==========================================================================");
  console.log(`  ACADEMIC AI — SYNTHETIC DATASET SEEDING (Target: ${STUDENT_COUNT} Students)`);
  console.log("==========================================================================");

  const teacherPw = await hashPassword("teacher123");
  const studentPw = await hashPassword("student123");

  // ── 1. Seed / Verify 6 Core Courses ──────────────────────────────────────────
  console.log("\n>>> Step 1: Ensuring 6 Core Academic Courses...");
  const courseSpecs = [
    { code: "CSE4001", title: "Natural Language Processing", color: "#6366f1", credits: 4, slot: "A1+TA1", faculty: "Dr. P. Raman" },
    { code: "CSE3002", title: "Machine Learning", color: "#10b981", credits: 4, slot: "B1+TB1", faculty: "Dr. S. Kulkarni" },
    { code: "CSE2004", title: "Operating Systems", color: "#f59e0b", credits: 4, slot: "F1+TF1", faculty: "Dr. K. Swaminathan" },
    { code: "CSE2001", title: "Computer Networks", color: "#06b6d4", credits: 3, slot: "C1+TC1", faculty: "Prof. M. Verma" },
    { code: "CSE3001", title: "Database Systems", color: "#ec4899", credits: 4, slot: "E1+TE1", faculty: "Dr. K. Senthil" },
    { code: "MAT2001", title: "Applied Statistics", color: "#8b5cf6", credits: 3, slot: "D1+TD1", faculty: "Dr. A. Sharma" },
  ];

  const courseMap: Record<string, string> = {};
  for (const spec of courseSpecs) {
    const c = await prisma.course.upsert({
      where: { code: spec.code },
      update: { title: spec.title, faculty: spec.faculty, credits: spec.credits, color: spec.color, slot: spec.slot },
      create: { ...spec },
    });
    courseMap[spec.code] = c.id;
    console.log(`  ✔ [${spec.code}] ${spec.title} (ID: ${c.id})`);
  }

  // ── 2. Seed / Verify 6 Faculty Accounts with CourseFaculty Assignments ───────
  console.log("\n>>> Step 2: Ensuring 6 Faculty Accounts with Explicit Course Assignments...");
  const facultySpecs = [
    {
      id: "faculty-academic-demo-01",
      name: "Dr. P. Raman",
      email: "faculty.raman@academic.ai",
      rollNumber: "FAC-NLP-01",
      department: "Department of AI and Data Science",
      program: "Faculty of Computer Engineering",
      courses: ["CSE4001"],
    },
    {
      id: "faculty-academic-demo-02",
      name: "Dr. S. Kulkarni",
      email: "faculty.kulkarni@academic.ai",
      rollNumber: "FAC-ML-02",
      department: "Department of Computer Science",
      program: "Faculty of Computing",
      courses: ["CSE3002"],
    },
    {
      id: "faculty-academic-demo-03",
      name: "Dr. K. Swaminathan",
      email: "faculty.swaminathan@academic.ai",
      rollNumber: "FAC-OS-03",
      department: "Department of Software Systems",
      program: "Faculty of Systems Engineering",
      courses: ["CSE2004"],
    },
    {
      id: "faculty-academic-demo-04",
      name: "Prof. M. Verma",
      email: "faculty.verma@academic.ai",
      rollNumber: "FAC-CN-04",
      department: "Department of Network Systems",
      program: "Faculty of Telecommunications",
      courses: ["CSE2001"],
    },
    {
      id: "faculty-academic-demo-05",
      name: "Dr. K. Senthil",
      email: "faculty.senthil@academic.ai",
      rollNumber: "FAC-DB-05",
      department: "Department of Database Engineering",
      program: "Faculty of Computing",
      courses: ["CSE3001"],
    },
    {
      id: "faculty-academic-demo-06",
      name: "Dr. A. Sharma",
      email: "faculty.sharma@academic.ai",
      rollNumber: "FAC-STAT-06",
      department: "Department of Mathematics & Statistics",
      program: "Faculty of Basic Sciences",
      courses: ["MAT2001"],
    },
  ];

  for (const f of facultySpecs) {
    await prisma.user.upsert({
      where: { id: f.id },
      update: {
        name: f.name,
        email: f.email,
        rollNumber: f.rollNumber,
        role: "TEACHER",
        passwordHash: teacherPw,
        department: f.department,
        program: f.program,
      },
      create: {
        id: f.id,
        name: f.name,
        email: f.email,
        rollNumber: f.rollNumber,
        role: "TEACHER",
        passwordHash: teacherPw,
        department: f.department,
        program: f.program,
      },
    });

    for (const code of f.courses) {
      const courseId = courseMap[code];
      if (courseId) {
        await prisma.courseFaculty.upsert({
          where: { userId_courseId: { userId: f.id, courseId } },
          update: {},
          create: { userId: f.id, courseId, role: "PRIMARY_INSTRUCTOR" },
        });
      }
    }
    console.log(`  ✔ Faculty [${f.rollNumber}] ${f.name} -> Managed: ${f.courses.join(", ")}`);
  }

  // ── 3. Seed Syllabi for Courses ──────────────────────────────────────────────
  console.log("\n>>> Step 3: Ensuring Course-Specific Syllabi...");
  const syllabusData: Record<string, { title: string; modules: any[]; outcomes: string[]; assessments: any[] }> = {
    CSE4001: {
      title: "Natural Language Processing Syllabus",
      modules: [
        { moduleNumber: 1, title: "Introduction & Tokenization", hours: 6, topics: "Corpus analysis, sentence segmenting, Byte-Pair Encoding (BPE), WordPiece" },
        { moduleNumber: 2, title: "Language Models & N-grams", hours: 6, topics: "Markov assumptions, Katz backoff, Kneser-Ney smoothing, Perplexity evaluation" },
        { moduleNumber: 3, title: "Sequence Labeling & HMM / CRF", hours: 6, topics: "POS tagging, Viterbi algorithm, Forward-Backward algorithm, Named Entity Recognition" },
        { moduleNumber: 4, title: "Word Vectors & Embeddings", hours: 8, topics: "Word2Vec (Skip-gram & CBOW), GloVe, FastText subword representations, Cosine similarity" },
        { moduleNumber: 5, title: "Transformers & Attention Mechanism", hours: 8, topics: "Scaled dot-product attention, multi-head self-attention, positional encoding, BERT, RoBERTa" },
        { moduleNumber: 6, title: "Modern LLMs & Prompt Engineering", hours: 6, topics: "Decoder-only architectures, RLHF, instruction tuning, RAG pipelines, hallucination mitigation" },
      ],
      outcomes: [
        "CO1: Design text pre-processing and subword tokenization pipelines.",
        "CO2: Implement statistical n-gram language models with smoothing.",
        "CO3: Formulate sequence labeling with Hidden Markov Models and conditional fields.",
        "CO4: Train distributed semantic representations using continuous skip-gram architectures.",
        "CO5: Construct Transformer-based attention models and evaluate NLP metrics.",
      ],
      assessments: [
        { component: "Continuous Assessment Tests (CAT-1 & CAT-2)", weight: 30 },
        { component: "Capstone Project Review 1 & 2", weight: 30 },
        { component: "Assignments & Lab Exercises", weight: 20 },
        { component: "Final Assessment Test (FAT)", weight: 20 },
      ],
    },
    CSE3002: {
      title: "Machine Learning Syllabus",
      modules: [
        { moduleNumber: 1, title: "Foundations & Linear Regression", hours: 6, topics: "Cost functions, gradient descent, normal equations, polynomial fitting" },
        { moduleNumber: 2, title: "Classification & Logistic Regression", hours: 6, topics: "Sigmoid activation, decision boundaries, multi-class softmax, cross-entropy loss" },
        { moduleNumber: 3, title: "Kernel Methods & Support Vector Machines", hours: 8, topics: "Hard & soft margins, dual formulations, RBF kernel trick, slack variables" },
        { moduleNumber: 4, title: "Decision Trees & Ensemble Methods", hours: 8, topics: "ID3, Gini index, Random Forests, AdaBoost, XGBoost gradient boosting" },
        { moduleNumber: 5, title: "Unsupervised Learning & Clustering", hours: 6, topics: "K-Means, Gaussian Mixture Models, PCA dimensionality reduction, t-SNE" },
        { moduleNumber: 6, title: "Neural Networks & Backpropagation", hours: 6, topics: "Perceptron, MLP, computational graphs, Adam optimizer, regularization" },
      ],
      outcomes: [
        "CO1: Analyze supervised learning paradigms using regression and classification.",
        "CO2: Apply margin-based learning and kernel tricks to non-linear data.",
        "CO3: Evaluate ensemble models and decision forests on tabular data.",
        "CO4: Formulate unsupervised clustering and latent dimension discovery.",
      ],
      assessments: [
        { component: "CAT-1 & CAT-2 Tests", weight: 30 },
        { component: "Term Paper & Code Artifact", weight: 30 },
        { component: "Lab Practical Benchmarks", weight: 20 },
        { component: "FAT Exam", weight: 20 },
      ],
    },
    CSE2004: {
      title: "Operating Systems Syllabus",
      modules: [
        { moduleNumber: 1, title: "OS Architecture & System Calls", hours: 6, topics: "Monolithic vs microkernels, fork, exec, wait, trap handlers" },
        { moduleNumber: 2, title: "Process Scheduling & Concurrency", hours: 8, topics: "Round-robin, multi-level feedback queues, critical section problem, Peterson's algorithm" },
        { moduleNumber: 3, title: "Synchronization & Deadlocks", hours: 8, topics: "Mutex, counting semaphores, monitors, Banker's algorithm, resource allocation graphs" },
        { moduleNumber: 4, title: "Memory Management & Paging", hours: 8, topics: "Virtual memory, TLB, page replacement (FIFO, LRU, Optimal), thrashing" },
        { moduleNumber: 5, title: "File Systems & I/O", hours: 6, topics: "Inodes, directory structures, journaling, disk scheduling (SCAN, C-LOOK)" },
      ],
      outcomes: [
        "CO1: Model concurrent processes and thread synchronization primitives.",
        "CO2: Prevent race conditions and deadlocks using algorithmic guarantees.",
        "CO3: Analyze virtual memory translation and page replacement overhead.",
      ],
      assessments: [
        { component: "CAT-1 & CAT-2 Exams", weight: 30 },
        { component: "Thread Synchronization Lab Exam", weight: 30 },
        { component: "Kernel Module Project", weight: 20 },
        { component: "Final Exam", weight: 20 },
      ],
    },
  };

  for (const [code, data] of Object.entries(syllabusData)) {
    const courseId = courseMap[code];
    if (!courseId) continue;
    const existing = await prisma.syllabus.findFirst({
      where: { courseId, isArchived: false },
    });
    if (!existing) {
      await prisma.syllabus.create({
        data: {
          courseId,
          courseCode: code,
          title: data.title,
          semester: "Fall 2026-27",
          rawText: `${data.title} - Official Academic Syllabus for ${code}`,
          modulesJson: JSON.stringify(data.modules),
          courseOutcomesJson: JSON.stringify(data.outcomes),
          assessmentsJson: JSON.stringify(data.assessments),
          version: 1,
          isVerified: true,
        },
      });
      console.log(`  ✔ Syllabus created for ${code}`);
    } else {
      console.log(`  ✔ Syllabus exists for ${code}`);
    }
  }

  // ── 4. Seed Assessment Rubrics for Courses ────────────────────────────────────
  console.log("\n>>> Step 4: Ensuring Assessment Rubrics...");
  const rubricSpecs = [
    {
      courseCode: "CSE4001",
      taskTitle: "Capstone Project Review 1",
      title: "CSE4001 NLP Capstone Project Rubric (Official Academic Standard)",
      totalMarks: 100,
      criteria: [
        { id: "crit-1", title: "Problem Definition & Literature Survey", marks: 20, description: "Clear articulation of NLP challenge, domain scope, and comprehensive citation of recent SOTA papers." },
        { id: "crit-2", title: "Methodology & Architecture Design", marks: 25, description: "Rigorous pipeline specification: tokenization, embedding choice, model architecture (BiLSTM / Transformer), loss formulation." },
        { id: "crit-3", title: "Empirical Implementation & Code Quality", marks: 25, description: "Executable Python code, PyTorch/HuggingFace implementation, reproducible training scripts, modular design." },
        { id: "crit-4", title: "Evaluation Metrics & Error Analysis", marks: 20, description: "Evaluation on held-out test split, macro-F1, confusion matrix, error taxonomy, failure mode inspection." },
        { id: "crit-5", title: "Technical Report & Presentation", marks: 10, description: "IEEE format capstone document, clear diagrams, concise writing, honest disclosure of limitations." },
      ],
      guidelines: [
        "Plagiarism tolerance: strictly < 10% on Turnitin.",
        "Evaluation metrics must match true test split records without data leakage.",
        "Code must be submitted alongside report with reproducible seeds.",
      ],
    },
    {
      courseCode: "CSE3002",
      taskTitle: "Machine Learning Term Paper on Transformers",
      title: "CSE3002 Term Paper Rubric",
      totalMarks: 50,
      criteria: [
        { id: "crit-ml-1", title: "Theoretical Formulation & Math", marks: 15, description: "Clear derivation of self-attention, query/key/value projections, multi-head scaling." },
        { id: "crit-ml-2", title: "Experimental Benchmark", marks: 20, description: "Empirical comparison against baseline algorithms with controlled hyperparameters." },
        { id: "crit-ml-3", title: "Analysis & Visualizations", marks: 15, description: "Attention map visual inspection, loss curves, ablation study graphs." },
      ],
      guidelines: ["Must follow standard double-column conference template."],
    },
  ];

  for (const r of rubricSpecs) {
    const courseId = courseMap[r.courseCode];
    if (!courseId) continue;
    const existing = await prisma.rubric.findFirst({
      where: { courseId, taskTitle: r.taskTitle },
    });
    if (!existing) {
      await prisma.rubric.create({
        data: {
          courseId,
          courseCode: r.courseCode,
          taskTitle: r.taskTitle,
          title: r.title,
          totalMarks: r.totalMarks,
          criteriaJson: JSON.stringify(r.criteria),
          guidelinesJson: JSON.stringify(r.guidelines),
          version: 1,
          isVerified: true,
        },
      });
      console.log(`  ✔ Rubric created for [${r.courseCode}] ${r.taskTitle}`);
    } else {
      console.log(`  ✔ Rubric exists for [${r.courseCode}] ${r.taskTitle}`);
    }
  }

  // ── 5. Seed Synthetic Students (1..STUDENT_COUNT) ─────────────────────────────
  console.log(`\n>>> Step 5: Generating ${STUDENT_COUNT} Synthetic Students...`);
  const studentIds: string[] = [];

  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const pad = String(i).padStart(4, "0");
    const id = `student-synth-${pad}`;
    studentIds.push(id);

    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor((i - 1) / 3) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const email = `student.${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@academic.ai`;
    const rollNumber = `22BDS${pad}`;
    const program = PROGRAMS[(i - 1) % PROGRAMS.length];
    const semester = 6 + (i % 3); // 6, 7, 8

    await prisma.user.upsert({
      where: { id },
      update: {
        name: fullName,
        email,
        rollNumber,
        program,
        semester,
        role: "STUDENT",
      },
      create: {
        id,
        name: fullName,
        email,
        rollNumber,
        program,
        semester,
        role: "STUDENT",
        passwordHash: studentPw,
        department: "School of Computer Science & Engineering",
      },
    });
  }
  console.log(`  ✔ Successfully synced ${STUDENT_COUNT} student accounts.`);

  // ── 6. Seed Course Enrollments ───────────────────────────────────────────────
  console.log("\n>>> Step 6: Creating Multi-Course Enrollments for Students...");
  const allCourseCodes = ["CSE4001", "CSE3002", "CSE2004", "CSE2001", "CSE3001", "MAT2001"];
  let enrollmentCount = 0;

  for (let i = 0; i < studentIds.length; i++) {
    const sId = studentIds[i];
    // Each student enrolls in 2 to 3 courses deterministically
    const numCourses = 2 + (i % 2); // 2 or 3 courses
    for (let cIdx = 0; cIdx < numCourses; cIdx++) {
      const courseCode = allCourseCodes[(i + cIdx) % allCourseCodes.length];
      const courseId = courseMap[courseCode];
      if (!courseId) continue;

      const progress = 40 + ((i * 13) % 55); // 40% - 95%
      const section = i % 2 === 0 ? "A" : "B";

      await prisma.courseEnrollment.upsert({
        where: { userId_courseId: { userId: sId, courseId } },
        update: { progress, section },
        create: {
          userId: sId,
          courseId,
          section,
          semester: 8,
          progress,
          enrollmentStatus: "ACTIVE",
        },
      });
      enrollmentCount++;
    }
  }
  console.log(`  ✔ Seeded ${enrollmentCount} total student-to-course enrollments.`);

  // ── 7. Seed Tasks and Submissions for Review ─────────────────────────────────
  console.log("\n>>> Step 7: Populating Course Deliverables & Submissions...");
  const nlpCourseId = courseMap["CSE4001"];
  const osCourseId = courseMap["CSE2004"];
  const mlCourseId = courseMap["CSE3002"];

  let taskCount = 0;

  // For first 25 students, create Capstone 1 task in CSE4001 (Dr. Raman's course)
  for (let i = 0; i < Math.min(25, studentIds.length); i++) {
    const sId = studentIds[i];
    const taskId = `task-synth-nlp-capstone-${String(i + 1).padStart(3, "0")}`;

    // Cycle statuses: Completed, Needs Review, Overdue, Pending
    const cycle = i % 4;
    let status = "PENDING";
    let pct = 0;
    let note = "Awaiting submission upload.";
    let deadline = new Date(Date.now() + 86400000 * 4); // 4 days later

    if (cycle === 0) {
      status = "COMPLETED";
      pct = 100;
      note = "Graded by Dr. P. Raman: Excellent Transformer attention analysis and rigorous code evidence. [Score: 94]";
      deadline = new Date(Date.now() - 86400000 * 3);
    } else if (cycle === 1) {
      status = "IN_PROGRESS";
      pct = 85;
      note = "Submitted via Academic Portal; awaiting faculty review & grading against rubric.";
      deadline = new Date(Date.now() + 86400000 * 2);
    } else if (cycle === 2) {
      status = "OVERDUE";
      pct = 0;
      note = "Deadline elapsed without document submission.";
      deadline = new Date(Date.now() - 86400000 * 2);
    }

    await prisma.task.upsert({
      where: { id: taskId },
      update: { status, deadline },
      create: {
        id: taskId,
        userId: sId,
        courseId: nlpCourseId,
        title: "[CSE4001] Capstone Project Review 1",
        description: "Submit capstone research report covering problem formulation, dataset, architecture, and preliminary evaluation.",
        category: "PROJECT_REVIEW",
        deadline,
        priority: cycle === 2 ? "CRITICAL" : "HIGH",
        status,
        submissionPlatform: "Academic Portal",
        weightage: 20,
      },
    });

    await prisma.taskProgress.deleteMany({ where: { taskId } });
    await prisma.taskProgress.create({
      data: {
        taskId,
        percentage: pct,
        note,
      },
    });

    taskCount++;
  }

  // For students 26..45, create OS Lab in CSE2004 (Dr. Swaminathan's course)
  for (let i = 25; i < Math.min(45, studentIds.length); i++) {
    const sId = studentIds[i];
    const taskId = `task-synth-os-lab-${String(i + 1).padStart(3, "0")}`;
    const cycle = i % 3;

    let status = cycle === 0 ? "COMPLETED" : cycle === 1 ? "IN_PROGRESS" : "PENDING";
    let pct = cycle === 0 ? 100 : cycle === 1 ? 70 : 0;
    let note = cycle === 0 ? "Graded by Dr. K. Swaminathan [Score: 18/20]" : cycle === 1 ? "Code uploaded; awaiting review" : "Unsubmitted";

    await prisma.task.upsert({
      where: { id: taskId },
      update: { status },
      create: {
        id: taskId,
        userId: sId,
        courseId: osCourseId,
        title: "[CSE2004] Thread Synchronization Lab",
        description: "POSIX pthread and semaphore implementation with race condition prevention.",
        category: "ASSIGNMENT",
        deadline: new Date(Date.now() + 86400000 * 3),
        priority: "MEDIUM",
        status,
        submissionPlatform: "GitHub",
        weightage: 15,
      },
    });

    await prisma.taskProgress.deleteMany({ where: { taskId } });
    await prisma.taskProgress.create({
      data: {
        taskId,
        percentage: pct,
        note,
      },
    });
    taskCount++;
  }

  console.log(`  ✔ Seeded ${taskCount} active course assessment submissions.`);

  // ── 8. Summary Audit ────────────────────────────────────────────────────────
  const totalUsers = await prisma.user.count();
  const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });
  const totalTeachers = await prisma.user.count({ where: { role: "TEACHER" } });
  const totalEnrollments = await prisma.courseEnrollment.count();
  const totalCourses = await prisma.course.count();
  const totalTasks = await prisma.task.count();

  console.log("\n==========================================================================");
  console.log("  DATABASE SEEDING SUMMARY (VERIFIED FROM DATABASE)");
  console.log("==========================================================================");
  console.log(`  Total Users in DB       : ${totalUsers}`);
  console.log(`    - Students            : ${totalStudents}`);
  console.log(`    - Faculty             : ${totalTeachers}`);
  console.log(`  Total Courses           : ${totalCourses}`);
  console.log(`  Total Enrollments       : ${totalEnrollments}`);
  console.log(`  Total Tasks/Submissions : ${totalTasks}`);
  console.log("==========================================================================");
  console.log("  ✔ Done. Development dataset is ready, idempotent, and non-destructive.");
  console.log("==========================================================================\n");
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
