# Milestone 7 — Multimodal Academic Document Intelligence
## Checkpoint Status

| Checkpoint | Description | Status |
|---|---|---|
| M7-A | Document upload + file validation | **COMPLETE** |
| M7-B | PDF text extraction | **COMPLETE** |
| M7-C | Image/screenshot OCR | **COMPLETE** |
| M7-D | Multimodal → existing NLP pipeline | **COMPLETE** |
| M7-E | Evidence / source grounding | **COMPLETE** |
| M7-F | Academic relationship + action integration | **COMPLETE** |
| M7-G | Evaluation + regression + final verification | **COMPLETE** |

---

## Architecture Overview

```
                      Uploaded Document (PDF / Image / Screenshot)
                                          │
                                          ▼
                             [Secure File Validation]
                   (magic bytes, MIME type, 10MB limit, no scripts)
                                          │
                                          ▼
                      ┌───────────────────┴───────────────────┐
                      ▼                                       ▼
             [PDF Text Extractor]                    [Image OCR Extractor]
             (pdf-parse / pages)                    (tesseract.js / bboxes)
                      │                                       │
                      └───────────────────┬───────────────────┘
                                          │ combinedText + pages
                                          ▼
                       [Zero-Fabrication Guard]
                 (empty/unreadable -> graceful error, 0 tasks)
                                          │
                                          ▼
                    [EXISTING Milestone 2 NLP Pipeline]
                     processAcademicNotice(combinedText)
               (classifier → NER → temporal → extractor → summary)
                                          │
                                          ▼
                   [Milestone 7 Evidence Grounding]
                enrichEvidencesWithDocumentProvenance()
             (page numbers, extraction method, OCR conf, bboxes)
                                          │
                                          ▼
                 [EXISTING Milestone 3 Change Intelligence]
                       checkAcademicChanges(nlpAnalysis)
                 (NEW / DUPLICATE / UPDATED / RESCHEDULED / CANCELLED)
                                          │
                                          ▼
                   [User Confirmation Gating Modal]
                         /api/ingest/confirm
                                          │
                                          ▼
                 [EXISTING Milestone 4 Priority Engine]
                 calculateAcademicPriority(deliverable)
                                          │
                                          ▼
              [EXISTING Milestone 5 Notification Intelligence]
                     generateAdaptiveNotifications()
                                          │
                                          ▼
                [EXISTING Milestone 6 Academic Assistant]
                      Fresh schedule retrieval & chat
```

### Critical Architectural Guarantee
**NO secondary NLP or duplicate detection system was created.** The multimodal document intelligence module acts exclusively as an ingestion and grounding frontend that translates binary file formats into verified text and feeds directly into `processAcademicNotice()` and downstream engines.

---

## Implementation Details

### 1. Supported Formats & File Validation (`lib/document/validator.ts`)
- **Accepted Formats**: PDF (`application/pdf`), PNG (`image/png`), JPG/JPEG (`image/jpeg`)
- **Validation Layers**:
  - File extension sanitization (path traversal prevention, safe display names)
  - Magic-byte file signature validation (`%PDF` for PDF, `\x89PNG` for PNG, `0xFFD8FF` for JPEG)
  - Maximum file size: 10 MB (`MAX_FILE_SIZE_BYTES`)
  - Injection guard: Rejects executable headers and script tags (`#!`, `<%`, `<script`, `eval(`, `exec(`)
  - Safe error reporting: No absolute local filesystem paths exposed to users or clients

### 2. PDF Text Extraction (`lib/document/pdf-parser.ts`)
- Server-side parsing using `pdf-parse`
- Extracts textual layers with preservation of page boundaries (`--- PAGE N ---`)
- Preserves per-page metadata: `pageNumber`, character counts, extraction method (`PDF_TEXT`)
- Detects empty or scanned-only PDFs without text layers

### 3. OCR Text Extraction (`lib/document/image-ocr.ts`)
- Optical Character Recognition powered by `tesseract.js` (offline English training model)
- Preserves raw character stream without hallucination
- Extracts genuine bounding box coordinates (`x0, y0, x1, y1`) and confidence scores `[0..1]` directly from HOCR output
- Rejects low-confidence gibberish gracefully; never fabricates deliverables

### 4. Source Evidence & Provenance Grounding (`lib/document/evidence-grounding.ts`)
- Preserves provenance chain:
  `Uploaded Document → Extracted Text Page → NLP FieldEvidence → Academic Deliverable`
- Extends standard `FieldEvidence` into `DocumentFieldEvidence` containing:
  - `sourceFilename`: Sanitized basename
  - `pageNumber`: Exact page snippet originated from
  - `extractionMethod`: `PDF_TEXT` | `IMAGE_OCR` | `PDF_OCR`
  - `ocrConfidence`: Real numeric confidence from OCR (omitted if not provided)
  - `boundingBox`: Real bounding box coordinates from OCR (omitted if not provided)
- Serializes complete document metadata into `AcademicSource.sourceMetadata` JSON

### 5. Academic Relationships & Change Detection (`lib/nlp/change-intelligence.ts`)
- Supports all 5 academic relationships on document-sourced notices:
  - **`NEW`**: Unmatched deliverables -> `CREATE_NEW`
  - **`DUPLICATE`**: Repeated notices with wording variation -> `MARK_DUPLICATE` (no redundant tasks)
  - **`RESCHEDULED`**: Date/time shifts -> `RESCHEDULE_EXISTING` (preserves both previous and new datetime)
  - **`UPDATED`**: Multi-field modifications (e.g. marks + submission platform) -> `UPDATE_EXISTING`
  - **`CANCELLED`**: Official cancellation announcements -> `CANCEL_EXISTING` (disables reminders)
- **Unified Datetime Design**: Timestamp transitions are represented as unified datetime changes (`time` for events, `deadline` for tasks) matching the database `DateTime` schema.

---

## Benchmark Evaluation Results (M7-G)

Executed via: `npx tsx scripts/test-milestone7.ts`
Evaluation Dataset: **26 comprehensive scenarios across 11 document categories**

### Measurable Metrics

| Category | Metric | Result | Benchmark |
|---|---|---|---|
| **File Validation** | File Validation Success Rate | **100.00%** (26 / 26) | Rejects corrupted, oversized, unsupported files |
| **Text Extraction** | Text Extraction Success Rate | **100.00%** (23 / 23) | Safe empty/unreadable handling |
| **OCR Quality** | Character Error Rate (CER) | **3.19%** | Evaluated on degraded OCR scans |
| **OCR Quality** | Word Error Rate (WER) | **18.94%** | Evaluated on degraded OCR scans |
| **NLP Pipeline** | Classification Accuracy | **100.00%** (20 / 20) | Across all valid academic categories |
| **NLP Pipeline** | Entity Extraction Accuracy | **100.00%** (19 / 19) | Course code, platform, marks, venue |
| **NLP Pipeline** | Temporal Normalization Accuracy | **100.00%** (5 / 5) | Deadlines, event times, reschedules |
| **Change Intelligence** | Relationship Accuracy | **100.00%** (21 / 21) | Across all 5 relationship types |
| **Change Intelligence** | Proposed Action Accuracy | **100.00%** (21 / 21) | Correct action recommendation |
| **Ecosystem** | End-to-End Object Correctness | **100.00%** (1 / 1) | Doc -> NLP -> Priority -> Notifications |

### Manual Verification (`scripts/verify-m7-manual-cases.ts`)
1. **PDF assignment notice**: ✅ PASS (`[CSE4001] Assignment 3`, VTOP, 25 marks, NEW)
2. **Screenshot reschedule notice**: ✅ PASS (NLP Project Review shifted Friday 2 PM -> Monday 3 PM)
3. **Cancellation screenshot**: ✅ PASS (ML Quiz 3 cancelled, PENDING -> CANCELLED, CANCEL_EXISTING)
4. **Platform + marks update screenshot**: ✅ PASS (marks 20->25, platform VTOP->Moodle, UPDATE_EXISTING)
5. **Unreadable / blurry image**: ✅ PASS (zero deliverables fabricated, clear warning emitted)

---

## Full Regression Suite (Milestones 2–7)

| Suite | Script | Status | Results |
|---|---|---|---|
| **Milestone 2** | `scripts/test-milestone2.ts` | **PASS** | 82 / 82 tests passed (100%) |
| **Milestone 3** | `scripts/test-milestone3.ts` | **PASS** | 16 / 16 fixtures passed (100%) |
| **Milestone 4** | `scripts/test-milestone4.ts` | **PASS** | 20 / 20 scenarios passed (100%) |
| **Milestone 5** | `scripts/test-milestone5.ts` | **PASS** | 20 / 20 scenarios passed (100%) |
| **Milestone 6** | `scripts/test-milestone6.ts` | **PASS** | 31 / 31 scenarios passed (100%) |
| **Milestone 7** | `scripts/test-milestone7.ts` | **PASS** | 26 / 26 scenarios passed (100%) |
| **TypeScript** | `npx tsc --noEmit` | **PASS** | 0 errors |
| **ESLint** | `npm run lint` | **PASS** | 0 errors |
| **Build** | `npm run build` | **PASS** | 31 static/dynamic pages compiled |

---

## Verified Pages & Routes

- `/inbox`: Multi-modal document upload drag-and-drop zone + text paste workflow preserved
- `/dashboard`: Unified academic status overview and deadline cards
- `/tasks`: Active, completed, and rescheduled deliverables
- `/calendar`: Academic schedule visualizer
- `/notifications`: Adaptive deadline, reschedule, and cancellation alerts
- `/assistant`: AI Assistant chat with tool execution and grounded citations
- `/analytics`: Cognitive workload distribution and cognitive pressure graphs

---

## Known Limitations

1. **Complex Table Parsing**: Multi-column tables with merged cells in PDFs are linearized into plain text; structured table extraction without clear whitespace delimiters may require manual verification.
2. **Severely Distorted / Curved Images**: Highly skewed or curved mobile camera photos of printed paper without orientation correction may show higher OCR word error rates.
3. **Handwritten Notes**: Tesseract models in this deployment are tuned for printed English typography; handwritten student notes are not currently supported.

---

## Change Log

| Date | Checkpoint | Action |
|---|---|---|
| 2026-09-19 | — | Status file created, codebase audited |
| 2026-09-19 | M7-A/B/C/D | File validation, PDF extraction, Tesseract OCR, pipeline handoff implemented |
| 2026-09-19 | M7-E | Evidence grounding module created, confirm API extended with documentSource, inbox upload panel built |
| 2026-09-19 | M7-F | Created M7-F fixtures and test runner, validated relationship detection |
| 2026-09-19 | M7-F (Fix) | Fixed platform extraction/corrigendum detection, confirmed unified datetime transition design |
| 2026-09-19 | M7-G | Created 26-scenario evaluation suite, verified CER/WER metrics, ran manual verification, confirmed full regression M2-M7, zero lint/tsc errors, verified production build |
