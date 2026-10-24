/**
 * lib/intelligence/syllabus-store.ts
 *
 * Milestone 8-A — Syllabus Knowledge Store
 * In-memory repository for indexed course syllabi, providing instant lookups
 * for assistant queries, deliverable-to-module mappings, and course intelligence.
 */

import {
  StructuredSyllabus,
  SyllabusEngine,
  ModuleMatchResult,
  SyllabusQueryResponse,
} from "./syllabus-engine";

export type { StructuredSyllabus };

// ─── Default Curated Academic Syllabi ─────────────────────────────────────────

const SAMPLE_CSE4001_NLP_TEXT = `
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
`;

const SAMPLE_CSE3002_ML_TEXT = `
CSE3002 — Machine Learning
Faculty: Dr. S. Ramanathan
Credits: 4

Course Outcomes:
CO1: Formulate supervised and unsupervised learning problems.
CO2: Implement gradient descent, regularized regression, and classification algorithms.
CO3: Apply Support Vector Machines and kernel methods to nonlinear datasets.
CO4: Design clustering algorithms and dimensionality reduction pipelines.

Unit 1: Supervised Learning & Regression
- Linear Regression and Cost Functions
- Gradient Descent Optimization (Batch, Stochastic, Mini-batch)
- Polynomial Regression and Regularization (L1 Lasso, L2 Ridge)
- Logistic Regression and Multi-class Classification

Unit 2: Support Vector Machines & Tree Ensembles
- Margin Maximization and Support Vectors
- Kernel Trick and Radial Basis Functions
- Decision Trees (ID3, C4.5, CART)
- Random Forests, Gradient Boosting, and XGBoost

Unit 3: Unsupervised Learning & Clustering
- K-Means and Hierarchical Clustering
- Density-Based Clustering (DBSCAN)
- Principal Component Analysis (PCA) and t-SNE
- Anomaly Detection and Gaussian Mixture Models

Unit 4: Evaluation Metrics & Model Selection
- Cross-Validation and Hyperparameter Tuning (Grid Search)
- Confusion Matrix, ROC-AUC, and F1-Score
- Bias-Variance Tradeoff
- Capstone ML Project and Real-world Case Studies

Assessment:
Assignment — 20%
Project — 30%
CAT — 20%
FAT — 30%
`;

const SAMPLE_CSE2004_OS_TEXT = `
CSE2004 — Operating Systems
Faculty: Prof. Rajesh Kumar
Credits: 3

Module 1: Introduction to Operating Systems (4 hours)
- Operating System Structures and System Calls
- Dual-Mode Operation and Kernel Architecture

Module 2: Process Management (8 hours)
- Process State Model, Process Control Block (PCB)
- CPU Scheduling Algorithms (FCFS, SJF, Round Robin, Priority)
- Inter-Process Communication (IPC) and Pipes

Module 3: Concurrency & Synchronization (8 hours)
- Critical Section Problem and Race Conditions
- Peterson's Solution, Mutex Locks, and Semaphores
- Classical Synchronization Problems (Dining Philosophers, Producer-Consumer)
- Deadlock Characterization, Prevention, Avoidance (Banker's Algorithm), and Detection

Module 4: Memory Management (8 hours)
- Address Binding, Logical vs Physical Address Space
- Paging and Segmentation
- Virtual Memory, Demand Paging, and Page Replacement Algorithms (FIFO, LRU, Optimal)

Module 5: Storage & File Systems (6 hours)
- File System Implementation and Directory Structures
- Disk Scheduling Algorithms (FCFS, SSTF, SCAN, C-SCAN)

Assessment:
Assignment — 20%
CAT — 30%
FAT — 50%
`;

// ─── Syllabus Knowledge Store Class ───────────────────────────────────────────

export class SyllabusStore {
  private static syllabi: Map<string, StructuredSyllabus> = new Map();
  private static initialized = false;

  private static ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    // Seed default syllabi for the active demo courses
    const nlpSyllabus = SyllabusEngine.parseSyllabus(SAMPLE_CSE4001_NLP_TEXT, {
      defaultCourseCode: "CSE4001",
      sourceFilename: "CSE4001_NLP_Syllabus.pdf",
    });
    this.syllabi.set("CSE4001", nlpSyllabus);

    const mlSyllabus = SyllabusEngine.parseSyllabus(SAMPLE_CSE3002_ML_TEXT, {
      defaultCourseCode: "CSE3002",
      sourceFilename: "CSE3002_ML_Syllabus.pdf",
    });
    this.syllabi.set("CSE3002", mlSyllabus);

    const osSyllabus = SyllabusEngine.parseSyllabus(SAMPLE_CSE2004_OS_TEXT, {
      defaultCourseCode: "CSE2004",
      sourceFilename: "CSE2004_OS_Syllabus.pdf",
    });
    this.syllabi.set("CSE2004", osSyllabus);
  }

  /**
   * Register or overwrite a parsed syllabus in the store.
   */
  public static registerSyllabus(syllabus: StructuredSyllabus): void {
    this.ensureInitialized();
    const code = syllabus.courseCode.toUpperCase();
    this.syllabi.set(code, syllabus);
  }

  /**
   * Retrieve structured syllabus for a specific course code.
   */
  public static getSyllabus(courseCode: string): StructuredSyllabus | null {
    this.ensureInitialized();
    const cleanCode = courseCode.replace(/\s+/g, "").toUpperCase();
    return this.syllabi.get(cleanCode) || null;
  }

  /**
   * Get all registered syllabi.
   */
  public static getAllSyllabi(): StructuredSyllabus[] {
    this.ensureInitialized();
    return Array.from(this.syllabi.values());
  }

  /**
   * Finds the syllabus module related to a deliverable or query.
   * e.g. "Which module is my NLP project related to?"
   */
  public static findModuleForDeliverable(
    queryOrDeliverable: string,
    courseCodeHint?: string
  ): { syllabus: StructuredSyllabus; match: ModuleMatchResult } | null {
    this.ensureInitialized();

    // If a specific course code is provided or inferrable from the query
    let targetCode = courseCodeHint?.replace(/\s+/g, "").toUpperCase();
    if (!targetCode) {
      const codeMatch = queryOrDeliverable.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/i);
      if (codeMatch) {
        targetCode = codeMatch[1].replace(/\s+/g, "").toUpperCase();
      } else if (/nlp|natural language/i.test(queryOrDeliverable)) {
        targetCode = "CSE4001";
      } else if (/machine learning|\bml\b/i.test(queryOrDeliverable)) {
        targetCode = "CSE3002";
      } else if (/operating systems|\bos\b/i.test(queryOrDeliverable)) {
        targetCode = "CSE2004";
      }
    }

    if (targetCode && this.syllabi.has(targetCode)) {
      const syl = this.syllabi.get(targetCode)!;
      const match = SyllabusEngine.findRelatedModule(queryOrDeliverable, syl);
      if (match) {
        return { syllabus: syl, match };
      }
    }

    // Fallback: search across all registered syllabi
    for (const syl of this.syllabi.values()) {
      const match = SyllabusEngine.findRelatedModule(queryOrDeliverable, syl);
      if (match && match.relevanceScore >= 0.4) {
        return { syllabus: syl, match };
      }
    }

    return null;
  }

  /**
   * High-level query interface for the Academic Assistant.
   */
  public static query(query: string, courseCodeHint?: string): SyllabusQueryResponse {
    this.ensureInitialized();

    const rel = this.findModuleForDeliverable(query, courseCodeHint);
    if (rel) {
      return SyllabusEngine.querySyllabus(query, rel.syllabus);
    }

    // If course code is targeted but no module match found, return overview
    if (courseCodeHint && this.syllabi.has(courseCodeHint.toUpperCase())) {
      const syl = this.syllabi.get(courseCodeHint.toUpperCase())!;
      return SyllabusEngine.querySyllabus(query, syl);
    }

    return {
      matched: false,
      query,
      answer: "No specific syllabus information or module match found for this query.",
      evidence: [],
    };
  }
}
