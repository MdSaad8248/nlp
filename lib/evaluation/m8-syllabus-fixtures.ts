/**
 * lib/evaluation/m8-syllabus-fixtures.ts
 *
 * Milestone 8-A — Syllabus Intelligence Evaluation Fixtures
 * 16 comprehensive syllabus scenarios covering:
 * - Module/Topic extraction
 * - Learning outcomes identification
 * - Assessment and weightage breakdown (percentage & marks)
 * - Source evidence preservation
 * - Lecture hours extraction
 * - Scanned/OCR noisy syllabus parsing
 * - Malformed / unstructured syllabus handling
 * - Cross-referencing queries ("Which module is my NLP project related to?")
 */

export interface SyllabusScenario {
  id: string;
  name: string;
  category: "STANDARD" | "UNITS" | "HOURS" | "NOISY_OCR" | "MARKS_BASED" | "MALFORMED" | "QUERY";
  rawText: string;
  expected: {
    courseCode?: string;
    courseName?: string;
    faculty?: string;
    minModules?: number;
    expectedModuleTitles?: string[];
    minTopics?: number;
    expectedAssessments?: Array<{
      category: string;
      weightagePercentage?: number;
      marks?: number;
    }>;
    isMalformed?: boolean;
    query?: string;
    expectedMatchedModuleNumber?: number;
  };
}

export const M8_SYLLABUS_SCENARIOS: SyllabusScenario[] = [
  // ── Scenario 1: Standard VIT CSE4001 NLP Syllabus ────────────────────────────
  {
    id: "SYL-01",
    name: "CSE4001 Natural Language Processing (5 Modules, Full Assessment)",
    category: "STANDARD",
    rawText: `
CSE4001 — Natural Language Processing
Faculty: Dr. Academic Faculty
Credits: 4
Fall Semester 2026-27

Course Outcomes:
CO1: Understand the foundations of text processing, tokenization, and morphological analysis.
CO2: Implement n-gram language models, perplexity metrics, and smoothing techniques.
CO3: Apply neural sequence models and Transformer architectures (BERT, GPT) to NLP tasks.
CO4: Evaluate text classification, semantic analysis, and information retrieval systems.

Module 1: Text Processing
- Tokenization, Stemming, and Lemmatization
- Stopword removal and Text Normalization
- Regular Expressions and Finite State Automata
- Morphology and WordNet

Module 2: Language Models
- N-gram Language Modeling
- Perplexity and Evaluation Metrics
- Laplace, Good-Turing, and Kneser-Ney Smoothing
- Neural Language Models and Word Embeddings (Word2Vec, GloVe)

Module 3: Transformers and Deep Architectures
- Sequence-to-Sequence Models and Attention Mechanism
- Transformer Architecture (Self-Attention, Multi-Head Attention)
- Pre-trained Models: BERT, RoBERTa, and GPT
- Fine-tuning and Transfer Learning for Academic NLP

Module 4: Syntactic & Semantic Parsing
- Part-of-Speech (POS) Tagging with HMMs and CRFs
- Context-Free Grammars and Dependency Parsing
- Named Entity Recognition (NER)
- Word Sense Disambiguation and Coreference Resolution

Module 5: NLP Applications & Capstone Project
- Text Classification and Sentiment Analysis
- Extractive and Abstractive Text Summarization
- Question Answering Systems and RAG
- Academic NLP Capstone Project Implementation

Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
    `,
    expected: {
      courseCode: "CSE4001",
      courseName: "Natural Language Processing",
      faculty: "Dr. Academic Faculty",
      minModules: 5,
      expectedModuleTitles: ["Text Processing", "Language Models", "Transformers and Deep Architectures"],
      minTopics: 12,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "PROJECT", weightagePercentage: 30 },
        { category: "CAT", weightagePercentage: 20 },
        { category: "FAT", weightagePercentage: 30 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 2: CSE3002 Machine Learning (Unit Demarcations) ─────────────────
  {
    id: "SYL-02",
    name: "CSE3002 Machine Learning (Units 1-4 with Lab and Theory)",
    category: "UNITS",
    rawText: `
CSE3002: Machine Learning
Instructor: Dr. S. Ramanathan
Credit Hours: 4

Course Outcomes:
CO1: Formulate supervised and unsupervised learning problems.
CO2: Implement gradient descent, regularized regression, and classification algorithms.
CO3: Apply Support Vector Machines and kernel methods to nonlinear datasets.

Unit 1: Supervised Learning & Regression
- Linear Regression and Cost Functions
- Gradient Descent Optimization
- Polynomial Regression and Regularization

Unit 2: Support Vector Machines & Ensembles
- Margin Maximization and Support Vectors
- Kernel Trick and Radial Basis Functions
- Random Forests and Gradient Boosting

Unit 3: Unsupervised Learning & Clustering
- K-Means and Hierarchical Clustering
- Density-Based Clustering (DBSCAN)
- Principal Component Analysis (PCA)

Unit 4: Model Evaluation & Hyperparameter Tuning
- Cross-Validation and Hyperparameter Tuning
- Confusion Matrix, ROC-AUC, and F1-Score
- Bias-Variance Tradeoff

Assessment Scheme:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
    `,
    expected: {
      courseCode: "CSE3002",
      courseName: "Machine Learning",
      faculty: "Dr. S. Ramanathan",
      minModules: 4,
      expectedModuleTitles: ["Supervised Learning & Regression", "Support Vector Machines & Ensembles"],
      minTopics: 8,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "PROJECT", weightagePercentage: 30 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 3: CSE2004 Operating Systems with Lecture Hours ─────────────────
  {
    id: "SYL-03",
    name: "CSE2004 Operating Systems (Explicit Lecture Hours & Exam-Heavy)",
    category: "HOURS",
    rawText: `
CSE2004 — Operating Systems
Faculty: Prof. Rajesh Kumar
Credits: 3

Module 1 (4 hours): Introduction to Operating Systems
- Operating System Structures and System Calls
- Dual-Mode Operation and Kernel Architecture

Module 2 (8 hours): Process Management
- Process State Model, Process Control Block (PCB)
- CPU Scheduling Algorithms (FCFS, SJF, Round Robin, Priority)
- Inter-Process Communication (IPC) and Pipes

Module 3 (8 hours): Concurrency & Synchronization
- Critical Section Problem and Race Conditions
- Peterson's Solution, Mutex Locks, and Semaphores
- Deadlock Characterization, Prevention, Avoidance, and Detection

Module 4 (8 hours): Memory Management
- Address Binding, Logical vs Physical Address Space
- Paging and Segmentation
- Virtual Memory and Page Replacement Algorithms

Assessment:
Assignment — 20%
CAT — 30%
FAT — 50%
    `,
    expected: {
      courseCode: "CSE2004",
      courseName: "Operating Systems",
      faculty: "Prof. Rajesh Kumar",
      minModules: 4,
      expectedModuleTitles: ["Introduction to Operating Systems", "Process Management", "Concurrency & Synchronization"],
      minTopics: 8,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "CAT", weightagePercentage: 30 },
        { category: "FAT", weightagePercentage: 50 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 4: CSE3001 Database Management Systems ──────────────────────────
  {
    id: "SYL-04",
    name: "CSE3001 Database Management Systems (5 Modules, Quizzes & Projects)",
    category: "STANDARD",
    rawText: `
CSE3001 — Database Management Systems
Instructor: Dr. Meenakshi Sundaram
Credits: 4

Module 1: Introduction to Data Models and ER Diagrams
- Database Architecture and Schemas
- Entity-Relationship Modeling and Constraints
- Relational Model and Relational Algebra

Module 2: Structured Query Language (SQL)
- DDL, DML, and Complex SQL Queries
- Nested Subqueries and Aggregations
- Triggers, Views, and Stored Procedures

Module 3: Database Normalization
- Functional Dependencies and Decomposition
- First, Second, and Third Normal Forms (1NF, 2NF, 3NF)
- Boyce-Codd Normal Form (BCNF) and Multi-Valued Dependencies

Module 4: Transaction Management & Concurrency
- ACID Properties and Serializability
- Two-Phase Locking (2PL) and Timestamp Ordering
- Deadlock Handling in DBMS

Module 5: Storage and Indexing
- File Organization and RAID
- B-Trees and B+ Trees Indexing Techniques
- Hashing and Query Optimization

Evaluation Plan:
Quiz — 15%
Assignment — 15%
Project — 30%
FAT — 40%
    `,
    expected: {
      courseCode: "CSE3001",
      courseName: "Database Management Systems",
      minModules: 5,
      expectedModuleTitles: ["Introduction to Data Models and ER Diagrams", "Structured Query Language (SQL)"],
      expectedAssessments: [
        { category: "QUIZ", weightagePercentage: 15 },
        { category: "PROJECT", weightagePercentage: 30 },
        { category: "FAT", weightagePercentage: 40 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 5: CSE2001 Computer Networks ────────────────────────────────────
  {
    id: "SYL-05",
    name: "CSE2001 Computer Networks (Lab + Theory Integration)",
    category: "UNITS",
    rawText: `
CSE2001 — Computer Networks
Credits: 4

Unit 1: Physical and Data Link Layer
- Network Topologies, Switching, and Transmission Media
- Error Detection and Correction (CRC, Hamming Codes)
- Medium Access Control (CSMA/CD, CSMA/CA)

Unit 2: Network Layer and Routing
- IPv4 and IPv6 Addressing, Subnetting, and CIDR
- Distance Vector Routing and Link State Routing (OSPF)
- NAT, DHCP, and ICMP protocols

Unit 3: Transport Layer
- User Datagram Protocol (UDP)
- Transmission Control Protocol (TCP) Connection Management
- TCP Congestion Control (Tahoe, Reno) and Flow Control

Unit 4: Application Layer
- Domain Name System (DNS)
- HTTP, HTTPS, and Web Sockets
- Email Protocols (SMTP, POP3, IMAP)

Assessment:
Lab — 25%
Assignment — 15%
CAT — 30%
FAT — 30%
    `,
    expected: {
      courseCode: "CSE2001",
      courseName: "Computer Networks",
      minModules: 4,
      expectedAssessments: [
        { category: "LAB", weightagePercentage: 25 },
        { category: "CAT", weightagePercentage: 30 },
        { category: "FAT", weightagePercentage: 30 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 6: CSE3005 Artificial Intelligence ──────────────────────────────
  {
    id: "SYL-06",
    name: "CSE3005 Artificial Intelligence (Search, Logic, Probabilistic Reasoning)",
    category: "STANDARD",
    rawText: `
CSE3005: Artificial Intelligence
Faculty: Dr. Ananya Sharma
Credits: 4

Course Outcomes:
CO1: Formulate state space search problems.
CO2: Implement adversarial search and game-playing agents.
CO3: Model uncertain reasoning using Bayesian Networks.

Module 1: Problem Solving & Search
- Uninformed Search: BFS, DFS, Uniform Cost Search
- Informed Search: A* Search and Heuristics
- Constraint Satisfaction Problems (CSP)

Module 2: Adversarial Search & Games
- Minimax Algorithm and Alpha-Beta Pruning
- Evaluation Functions and Game Playing

Module 3: Knowledge Representation & Logic
- Propositional and First-Order Predicate Logic
- Forward and Backward Chaining, Resolution

Module 4: Probabilistic Reasoning
- Bayes Rule and Conditional Independence
- Bayesian Belief Networks and Inference

Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
    `,
    expected: {
      courseCode: "CSE3005",
      courseName: "Artificial Intelligence",
      minModules: 4,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "PROJECT", weightagePercentage: 30 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 7: MAT2001 Applied Statistics (Exam-Heavy) ──────────────────────
  {
    id: "SYL-07",
    name: "MAT2001 Applied Statistics (No Project, 100% Exam & Assignments)",
    category: "STANDARD",
    rawText: `
MAT2001 — Applied Statistics
Faculty: Dr. K. Venkataraman
Credits: 3

Module 1: Probability Distributions
- Random Variables and Expectation
- Binomial, Poisson, and Normal Distributions

Module 2: Sampling and Estimation
- Sampling Distributions and Central Limit Theorem
- Point Estimation and Maximum Likelihood

Module 3: Hypothesis Testing
- Null and Alternative Hypotheses, p-values
- Z-test, t-test, Chi-square test, and ANOVA

Assessment:
Assignment — 20%
CAT — 30%
FAT — 50%
    `,
    expected: {
      courseCode: "MAT2001",
      courseName: "Applied Statistics",
      minModules: 3,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "CAT", weightagePercentage: 30 },
        { category: "FAT", weightagePercentage: 50 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 8: Multi-page Syllabus Document Representation ───────────────────
  {
    id: "SYL-08",
    name: "Multi-page Syllabus Document (Metadata, Content, Grading)",
    category: "STANDARD",
    rawText: `
COURSE INFORMATION AND POLICY DOCUMENT
Course: CSE4002 Deep Learning
Instructor: Dr. Priya Nair (Email: priya.nair@academic.edu)
Credits: 4

Course Outcomes:
CO1: Understand feedforward neural networks and backpropagation.
CO2: Build Convolutional Neural Networks for computer vision.
CO3: Implement Recurrent Neural Networks and LSTMs for sequence modeling.

\f
DETAILED MODULE CONTENTS

Module 1: Deep Feedforward Networks
- Linear algebra and probability review
- Multi-Layer Perceptrons and Activation Functions
- Loss functions and Regularization (Dropout, Batch Norm)

Module 2: Convolutional Neural Networks (CNNs)
- Convolution and Pooling Operations
- Modern Architectures (ResNet, EfficientNet)
- Object Detection and Image Segmentation

Module 3: Sequence Modeling
- Recurrent Neural Networks (RNN) and Vanishing Gradients
- Long Short-Term Memory (LSTM) and GRU

\f
GRADING AND ASSESSMENT POLICY

Continuous Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
    `,
    expected: {
      courseCode: "CSE4002",
      courseName: "Deep Learning",
      faculty: "Dr. Priya Nair",
      minModules: 3,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "PROJECT", weightagePercentage: 30 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 9: Scanned / OCR Noisy Syllabus ─────────────────────────────────
  {
    id: "SYL-09",
    name: "OCR Noisy Scanned Syllabus (Typos, Artifacts, Uneven Spacing)",
    category: "NOISY_OCR",
    rawText: `
| CSE4001 - Natural Language Processing |
FACULTY: Dr. Academic Faculty
Cr: 4

Course Outcomes:
CO1: Text tokenization and basic morphology.
CO2: Language models and smoothing.

Module 1: Text Processing
- Tokenization , Stemming and Lemmatization
- Stopword removal & Normalization

Module 2: Language Models
- N-gram Language Modeling
- Perplexity metrics and Smoothing

Assessment:
Assignment - 20%
Project - 30%
CAT - 20%
FAT - 30%
    `,
    expected: {
      courseCode: "CSE4001",
      courseName: "Natural Language Processing",
      faculty: "Dr. Academic Faculty",
      minModules: 2,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "PROJECT", weightagePercentage: 30 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 10: Percentage Weightage Breakdown ──────────────────────────────
  {
    id: "SYL-10",
    name: "CSE3003 Software Engineering (Percentage Scheme)",
    category: "STANDARD",
    rawText: `
CSE3003 — Software Engineering
Credits: 3

Module 1: Software Process Models
- Waterfall, Agile, and Scrum Frameworks
- Requirements Engineering and User Stories

Module 2: System Modeling & Architecture
- UML Class, Sequence, and Activity Diagrams
- Microservices and Layered Architecture

Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
    `,
    expected: {
      courseCode: "CSE3003",
      courseName: "Software Engineering",
      minModules: 2,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "PROJECT", weightagePercentage: 30 },
        { category: "CAT", weightagePercentage: 20 },
        { category: "FAT", weightagePercentage: 30 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 11: Marks/Points Based Breakdown ────────────────────────────────
  {
    id: "SYL-11",
    name: "ECE3001 Internet of Things (Points / Marks Scheme)",
    category: "MARKS_BASED",
    rawText: `
ECE3001: Internet of Things
Faculty: Dr. Suresh Babu
Credits: 3

Module 1: IoT Sensors & Actuators
- Microcontrollers: Arduino, ESP32, and Raspberry Pi
- Sensor Interfaces and GPIO

Module 2: IoT Protocols
- MQTT, CoAP, and HTTP Restful APIs
- LoRaWAN and Zigbee Wireless Technologies

Evaluation Components:
Assignment: 50 marks
Project: 100 marks
FAT: 100 marks
    `,
    expected: {
      courseCode: "ECE3001",
      courseName: "Internet of Things",
      faculty: "Dr. Suresh Babu",
      minModules: 2,
      expectedAssessments: [
        { category: "ASSIGNMENT", marks: 50 },
        { category: "PROJECT", marks: 100 },
        { category: "FAT", marks: 100 },
      ],
      isMalformed: false,
    },
  },

  // ── Scenario 12: Malformed Syllabus — Unstructured Text ──────────────────────
  {
    id: "SYL-12",
    name: "Malformed Syllabus: Unstructured Paragraph Without Modules",
    category: "MALFORMED",
    rawText: `
Welcome to the course on Advanced Algorithms. In this course we will discuss various algorithm designs
including dynamic programming, greedy methods, and graph theory. Students will be evaluated based on their
understanding. Please attend all lectures regularly and consult the recommended textbook for additional reading.
    `,
    expected: {
      isMalformed: true,
      minModules: 0,
    },
  },

  // ── Scenario 13: Malformed Syllabus — Header Only, No Content ─────────────────
  {
    id: "SYL-13",
    name: "Malformed Syllabus: Course Info Only, Missing Modules & Assessments",
    category: "MALFORMED",
    rawText: `
Course Code: CSE9999
Course Title: Special Topics in Computing
Faculty: Dr. Guest Lecturer
Credits: 2
    `,
    expected: {
      courseCode: "CSE9999",
      isMalformed: true,
      minModules: 0,
    },
  },

  // ── Scenario 14: Malformed Syllabus — Assessments Only, Missing Modules ──────
  {
    id: "SYL-14",
    name: "Malformed Syllabus: Assessment Breakdown Only, Missing Modules",
    category: "MALFORMED",
    rawText: `
Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
    `,
    expected: {
      minModules: 0,
      expectedAssessments: [
        { category: "ASSIGNMENT", weightagePercentage: 20 },
        { category: "PROJECT", weightagePercentage: 30 },
      ],
      isMalformed: false, // Partial, but has valid assessments
    },
  },

  // ── Scenario 15: Cross-Referencing Query — "Which module is my NLP project related to?" ──
  {
    id: "SYL-15",
    name: "Query: 'Which module is my NLP project related to?'",
    category: "QUERY",
    rawText: SAMPLE_CSE4001_NLP_TEXT_FOR_QUERY(),
    expected: {
      query: "Which module is my NLP project related to?",
      expectedMatchedModuleNumber: 5, // Module 5: NLP Applications & Capstone Project
      courseCode: "CSE4001",
    },
  },

  // ── Scenario 16: Cross-Referencing Query — "Which module covers Language Models?" ──
  {
    id: "SYL-16",
    name: "Query: 'Which module covers Language Models and n-grams?'",
    category: "QUERY",
    rawText: SAMPLE_CSE4001_NLP_TEXT_FOR_QUERY(),
    expected: {
      query: "Which module covers Language Models and n-grams?",
      expectedMatchedModuleNumber: 2, // Module 2: Language Models
      courseCode: "CSE4001",
    },
  },
];

function SAMPLE_CSE4001_NLP_TEXT_FOR_QUERY(): string {
  return `
CSE4001 — Natural Language Processing
Faculty: Dr. Academic Faculty
Credits: 4

Module 1: Text Processing
- Tokenization, Stemming, and Lemmatization
- Stopword removal and Text Normalization

Module 2: Language Models
- N-gram Language Modeling
- Perplexity and Smoothing

Module 3: Transformers and Deep Architectures
- Sequence-to-Sequence Models and Attention Mechanism
- Transformer Architecture and BERT

Module 4: Syntactic & Semantic Parsing
- POS Tagging and Dependency Parsing
- Named Entity Recognition (NER)

Module 5: NLP Applications & Capstone Project
- Text Classification and Sentiment Analysis
- Academic NLP Capstone Project Implementation

Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
  `;
}
