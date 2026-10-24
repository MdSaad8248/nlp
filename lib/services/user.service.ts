import { prisma } from "@/lib/db/prisma";
import { DEMO_STUDENTS, DEMO_TEACHERS, DEFAULT_STUDENT_SESSION } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { SyllabusEngine } from "@/lib/intelligence/syllabus-engine";
import { RubricEngine } from "@/lib/intelligence/rubric-engine";

export async function ensureDefaultUserAndCourses(): Promise<{
  userId: string;
  courses: Record<string, string>; // course code/title -> courseId
}> {
  // 1. Ensure all core courses exist
  const coreCourses = [
    { code: "CSE4001", title: "Natural Language Processing", faculty: "Dr. P. Raman", credits: 4, slot: "A1+TA1", color: "#6366f1" },
    { code: "CSE3002", title: "Machine Learning", faculty: "Dr. S. Kulkarni", credits: 4, slot: "B1+TB1", color: "#ec4899" },
    { code: "CSE2001", title: "Computer Networks", faculty: "Prof. M. Verma", credits: 3, slot: "C1+TC1", color: "#06b6d4" },
    { code: "MAT2001", title: "Applied Statistics", faculty: "Dr. A. Sharma", credits: 3, slot: "D1+TD1", color: "#10b981" },
    { code: "CSE3001", title: "Database Management Systems", faculty: "Prof. R. Nair", credits: 4, slot: "E1+TE1", color: "#f59e0b" },
    { code: "CSE2004", title: "Operating Systems", faculty: "Dr. K. Swaminathan", credits: 4, slot: "F1+TF1", color: "#8b5cf6" },
  ];

  const courseMap: Record<string, string> = {};

  for (const c of coreCourses) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        title: c.title,
        faculty: c.faculty,
        credits: c.credits,
        slot: c.slot,
        color: c.color,
      },
    });

    courseMap[c.code.toLowerCase()] = course.id;
    courseMap[c.title.toLowerCase()] = course.id;
  }

  // Pre-generate standard password hashes
  const studentPasswordHash = await hashPassword("student123");
  const teacherPasswordHash = await hashPassword("teacher123");

  // 2. Ensure each Demo Student exists with proper enrollments & preferences
  for (const s of DEMO_STUDENTS) {
    const user = await prisma.user.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        email: s.email,
        rollNumber: s.rollNumber,
        role: "STUDENT",
        passwordHash: studentPasswordHash,
        program: s.program,
        semester: s.semester || 8,
      },
      create: {
        id: s.id,
        email: s.email,
        name: s.name,
        rollNumber: s.rollNumber,
        role: "STUDENT",
        passwordHash: studentPasswordHash,
        program: s.program,
        semester: s.semester || 8,
      },
    });

    await prisma.studentPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        academicTimezone: "Asia/Kolkata",
        notificationLeadDays: 2,
        highWorkloadThreshold: 4,
      },
    });

    // Student-specific course enrollments
    let enrolledCodes: string[] = [];
    if (s.id === "student-academic-demo-01") {
      enrolledCodes = ["CSE4001", "CSE3002", "CSE2001", "MAT2001"];
    } else if (s.id === "student-academic-demo-02") {
      enrolledCodes = ["CSE3002", "CSE3001", "CSE2004"];
    } else {
      enrolledCodes = ["CSE2001", "MAT2001"];
    }

    for (const code of enrolledCodes) {
      const cId = courseMap[code.toLowerCase()];
      if (cId) {
        await prisma.courseEnrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: cId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            courseId: cId,
          },
        });
      }
    }
  }

  // 3. Ensure each Demo Teacher exists with CourseFaculty mappings
  for (const t of DEMO_TEACHERS) {
    const teacherUser = await prisma.user.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        email: t.email,
        rollNumber: t.rollNumber,
        role: "TEACHER",
        passwordHash: teacherPasswordHash,
        department: t.department,
        program: t.program,
      },
      create: {
        id: t.id,
        email: t.email,
        name: t.name,
        rollNumber: t.rollNumber,
        role: "TEACHER",
        passwordHash: teacherPasswordHash,
        department: t.department,
        program: t.program,
      },
    });

    // Assign faculty to their authorized course
    if (t.assignedCourses && t.assignedCourses.length > 0) {
      for (const courseCode of t.assignedCourses) {
        const cId = courseMap[courseCode.toLowerCase()];
        if (cId) {
          await prisma.courseFaculty.upsert({
            where: {
              userId_courseId: {
                userId: teacherUser.id,
                courseId: cId,
              },
            },
            update: {},
            create: {
              userId: teacherUser.id,
              courseId: cId,
              role: "PRIMARY_INSTRUCTOR",
            },
          });
        }
      }
    }
  }

  // 4. Ensure Student B and Student C have distinct academic tasks if they have none
  const studentBTasks = await prisma.task.count({ where: { userId: "student-academic-demo-02" } });
  if (studentBTasks === 0) {
    const mlCourseId = courseMap["cse3002"];
    const dbmsCourseId = courseMap["cse3001"];
    const osCourseId = courseMap["cse2004"];

    await prisma.task.createMany({
      data: [
        {
          id: "task-student-b-ml",
          userId: "student-academic-demo-02",
          courseId: mlCourseId || null,
          title: "Machine Learning Term Paper on Transformers",
          category: "REPORT",
          deadline: new Date(Date.now() + 36 * 3600 * 1000),
          normalizedDeadline: "Tomorrow at 11:59 PM (IST)",
          priority: "HIGH",
          status: "PENDING",
          submissionPlatform: "VTOP",
          weightage: 15,
          estimatedHours: 5,
        },
        {
          id: "task-student-b-dbms",
          userId: "student-academic-demo-02",
          courseId: dbmsCourseId || null,
          title: "DBMS Distributed Schema Optimization",
          category: "ASSIGNMENT",
          deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000),
          normalizedDeadline: "In 5 days at 05:00 PM (IST)",
          priority: "MEDIUM",
          status: "PENDING",
          submissionPlatform: "Moodle",
          weightage: 10,
          estimatedHours: 4,
        },
        {
          id: "task-student-b-os",
          userId: "student-academic-demo-02",
          courseId: osCourseId || null,
          title: "Operating Systems Thread Synchronization Lab",
          category: "ASSIGNMENT",
          deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          normalizedDeadline: "In 7 days at 11:59 PM (IST)",
          priority: "LOW",
          status: "PENDING",
          submissionPlatform: "Canvas",
          weightage: 10,
          estimatedHours: 3,
        },
      ],
    });

    await prisma.event.create({
      data: {
        id: "event-student-b-os",
        userId: "student-academic-demo-02",
        courseId: osCourseId || null,
        title: "OS Virtual Memory Review Session",
        eventType: "REVIEW",
        venue: "SJT 501",
        startTime: new Date(Date.now() + 48 * 3600 * 1000),
        endTime: new Date(Date.now() + 50 * 3600 * 1000),
      },
    });
  }

  const studentCTasks = await prisma.task.count({ where: { userId: "student-academic-demo-03" } });
  if (studentCTasks === 0) {
    const netCourseId = courseMap["cse2001"];
    const statCourseId = courseMap["mat2001"];

    await prisma.task.createMany({
      data: [
        {
          id: "task-student-c-net-done",
          userId: "student-academic-demo-03",
          courseId: netCourseId || null,
          title: "Wireshark Packet Inspection Report",
          category: "REPORT",
          deadline: new Date(Date.now() - 24 * 3600 * 1000),
          normalizedDeadline: "Yesterday at 11:59 PM (IST)",
          priority: "LOW",
          status: "COMPLETED",
          submissionPlatform: "VTOP",
          weightage: 10,
          estimatedHours: 2,
        },
        {
          id: "task-student-c-stat",
          userId: "student-academic-demo-03",
          courseId: statCourseId || null,
          title: "Applied Statistics Regression Problem Set",
          category: "ASSIGNMENT",
          deadline: new Date(Date.now() + 9 * 24 * 3600 * 1000),
          normalizedDeadline: "In 9 days at 11:59 PM (IST)",
          priority: "LOW",
          status: "PENDING",
          submissionPlatform: "Moodle",
          weightage: 10,
          estimatedHours: 3,
        },
      ],
    });
  }

  // 5. Seed genuine persistent syllabi in DB if table is empty
  const syllabusCount = await prisma.syllabus.count();
  if (syllabusCount === 0) {
    const nlpCourseId = courseMap["cse4001"];
    const mlCourseId = courseMap["cse3002"];
    const osCourseId = courseMap["cse2004"];

    const sampleNLPSyllabus = `CSE4001 — Natural Language Processing
Faculty: Dr. P. Raman
Credits: 4
Fall Semester 2026-27

Course Outcomes:
CO1: Understand the foundations of text processing, tokenization, and morphological analysis.
CO2: Implement n-gram language models, perplexity metrics, and smoothing techniques.
CO3: Apply neural sequence models and Transformer architectures (BERT, GPT) to NLP tasks.
CO4: Evaluate text classification, semantic analysis, and information retrieval systems.

Module 1: Text Processing (6 hours)
- Tokenization, Stemming, and Lemmatization
- Stopword removal and Text Normalization
- Regular Expressions and Finite State Automata
- Morphology and WordNet

Module 2: Language Models (8 hours)
- N-gram Language Modeling
- Perplexity and Evaluation Metrics
- Laplace, Good-Turing, and Kneser-Ney Smoothing
- Neural Language Models and Word Embeddings (Word2Vec, GloVe)

Module 3: Transformers and Deep Architectures (10 hours)
- Sequence-to-Sequence Models and Attention Mechanism
- Transformer Architecture (Self-Attention, Multi-Head Attention)
- Pre-trained Models: BERT, RoBERTa, and GPT
- Fine-tuning and Transfer Learning for Academic NLP

Module 4: Syntactic & Semantic Parsing (8 hours)
- Part-of-Speech (POS) Tagging with HMMs and CRFs
- Context-Free Grammars and Dependency Parsing
- Named Entity Recognition (NER)
- Word Sense Disambiguation and Coreference Resolution

Module 5: NLP Applications & Capstone Project (8 hours)
- Text Classification and Sentiment Analysis
- Extractive and Abstractive Text Summarization
- Question Answering Systems and RAG
- Academic NLP Capstone Project Implementation

Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%`;

    const parsedNLP = SyllabusEngine.parseSyllabus(sampleNLPSyllabus, {
      defaultCourseCode: "CSE4001",
      sourceFilename: "CSE4001_Syllabus.pdf",
    });

    if (nlpCourseId) {
      await prisma.syllabus.create({
        data: {
          courseId: nlpCourseId,
          courseCode: "CSE4001",
          title: "Natural Language Processing Syllabus",
          semester: "Fall 2026-27",
          facultyId: "faculty-academic-demo-01",
          sourceFilename: "CSE4001_Syllabus.pdf",
          rawText: sampleNLPSyllabus,
          modulesJson: JSON.stringify(parsedNLP.modules),
          courseOutcomesJson: JSON.stringify(parsedNLP.learningOutcomes),
          assessmentsJson: JSON.stringify(parsedNLP.assessments),
          version: 1,
          isVerified: true,
        },
      });
    }

    if (mlCourseId) {
      const sampleMLSyllabus = `CSE3002 — Machine Learning
Faculty: Dr. S. Kulkarni
Credits: 4

Course Outcomes:
CO1: Formulate supervised and unsupervised learning problems.
CO2: Implement gradient descent, regularized regression, and classification algorithms.
CO3: Apply Support Vector Machines and kernel methods to nonlinear datasets.
CO4: Design clustering algorithms and dimensionality reduction pipelines.

Unit 1: Supervised Learning & Regression (8 hours)
- Linear Regression and Cost Functions
- Gradient Descent Optimization
- Polynomial Regression and Regularization (L1 Lasso, L2 Ridge)
- Logistic Regression and Multi-class Classification

Unit 2: Support Vector Machines & Tree Ensembles (8 hours)
- Margin Maximization and Support Vectors
- Kernel Trick and Radial Basis Functions
- Decision Trees (ID3, CART)
- Random Forests and Gradient Boosting

Unit 3: Unsupervised Learning & Clustering (8 hours)
- K-Means and Hierarchical Clustering
- Density-Based Clustering (DBSCAN)
- Principal Component Analysis (PCA)

Unit 4: Evaluation Metrics & Model Selection (6 hours)
- Cross-Validation and Hyperparameter Tuning
- Confusion Matrix, ROC-AUC, and F1-Score
- Bias-Variance Tradeoff`;

      const parsedML = SyllabusEngine.parseSyllabus(sampleMLSyllabus, {
        defaultCourseCode: "CSE3002",
        sourceFilename: "CSE3002_ML_Syllabus.pdf",
      });

      await prisma.syllabus.create({
        data: {
          courseId: mlCourseId,
          courseCode: "CSE3002",
          title: "Machine Learning Syllabus",
          semester: "Fall 2026-27",
          facultyId: "faculty-academic-demo-02",
          sourceFilename: "CSE3002_ML_Syllabus.pdf",
          rawText: sampleMLSyllabus,
          modulesJson: JSON.stringify(parsedML.modules),
          courseOutcomesJson: JSON.stringify(parsedML.learningOutcomes),
          assessmentsJson: JSON.stringify(parsedML.assessments),
          version: 1,
          isVerified: true,
        },
      });
    }
  }

  // 6. Seed genuine persistent rubrics in DB if table is empty
  const rubricCount = await prisma.rubric.count();
  if (rubricCount === 0) {
    const nlpCourseId = courseMap["cse4001"];
    const mlCourseId = courseMap["cse3002"];

    const sampleNLPRubricText = `CSE4001 — Natural Language Processing Capstone Project Rubric
Total Marks: 100

Requirements:
1. Literature Survey — 10 marks
- Review of at least 5 recent peer-reviewed NLP papers
- Comparative analysis of existing transformer models

2. Dataset — 10 marks
- Data collection, annotation, and curation
- Preprocessing, tokenization, and train/val/test splits

3. Methodology — 15 marks
- Mathematical formulation of model architecture
- Attention mechanism and loss function design

4. Implementation — 25 marks
- PyTorch/HuggingFace implementation
- Clean modular code with reproducible training script

5. Evaluation — 20 marks
- Quantitative metrics: BLEU, ROUGE, F1, Perplexity
- Error analysis and ablation study

6. Presentation & Demo — 20 marks
- 10-minute live demonstration and code walkthrough
- Comprehensive IEEE format project report

Submission Guidelines:
- Submit report as PDF and GitHub repository link via VTOP before deadline.`;

    const parsedRubric = RubricEngine.parseRubric(sampleNLPRubricText, {
      taskTitleHint: "Capstone Project",
      courseCodeHint: "CSE4001",
      sourceDocument: "CSE4001_Project_Rubric.pdf",
    });

    if (nlpCourseId) {
      await prisma.rubric.create({
        data: {
          courseId: nlpCourseId,
          courseCode: "CSE4001",
          taskTitle: "Capstone Project",
          title: "CSE4001 Natural Language Processing Capstone Project Rubric",
          totalMarks: 100,
          sourceDocument: "CSE4001_Project_Rubric.pdf",
          criteriaJson: JSON.stringify(parsedRubric.requirements),
          guidelinesJson: JSON.stringify(parsedRubric.submissionGuidelines),
          authorId: "faculty-academic-demo-01",
          version: 1,
          isVerified: true,
        },
      });
    }
  }

  return {
    userId: DEFAULT_STUDENT_SESSION.id,
    courses: courseMap,
  };
}
