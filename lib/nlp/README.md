# AcademicAI NLP Architecture (Roadmap)

> **Milestone Notice**: No NLP modules are implemented in Milestone 1. 
> Modules will be implemented incrementally with real NLP models, rule-based parsers, and evaluation metrics in subsequent milestones.

### Planned NLP Modules (Milestone 3+):
1. **`classifier.ts`**: Academic Document Classification (Multi-class: Assignment, Quiz, Exam, Project, Circular, etc.)
2. **`ner.ts`**: Academic Named Entity Recognition (Course codes, faculties, deadlines, marks, venues)
3. **`temporal.ts`**: Temporal Information Extraction & Normalization with timezone resolution
4. **`extractor.ts`**: Academic Event/Task structured object extraction
5. **`change-detector.ts`**: Detection of rescheduled events, cancelled classes, and extended deadlines (Milestone 4)
6. **`duplicate-detector.ts`**: Deduplication of academic notices across channels (Milestone 4)
7. **`summarizer.ts`**: Actionable summarization of long notices
8. **`priority-engine.ts`**: Explainable multi-factor academic urgency reasoning (Milestone 5)
9. **`workload-analyzer.ts`**: Daily/weekly cognitive and deadline pressure analysis (Milestone 5)
10. **`document-parser.ts`**: Ingestion of text, circular PDFs, and screenshot OCR (Milestone 8)
11. **`schemas.ts`**: Strict Zod schemas for all structured extraction outputs
