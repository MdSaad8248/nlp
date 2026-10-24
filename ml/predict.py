"""
Academic Notice Classifier - Inference Module & CLI
===================================================
Provides fast inference for academic notice classification.
Supports Transformer (DistilBERT) and Baseline (TF-IDF + LogReg) with calibrated probabilities.
Includes configurable confidence threshold with automatic fallback flag.
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path

# Silence huggingface and transformers warnings on CLI
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
logging.getLogger("transformers").setLevel(logging.ERROR)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

MODELS_DIR = PROJECT_ROOT / "ml" / "models"
BASELINE_DIR = MODELS_DIR / "baseline_tfidf"
TRANSFORMER_DIR = MODELS_DIR / "transformer_distilbert"

# Global model cache to avoid reloading on repeated in-process calls
_CACHED_MODELS = {
    "transformer": None,
    "tokenizer": None,
    "baseline_clf": None,
    "baseline_vec": None,
    "label2id": None,
    "id2label": None,
    "device": None
}

DEFAULT_CONFIDENCE_THRESHOLD = 0.70


def _load_labels():
    if _CACHED_MODELS["id2label"] is not None:
        return _CACHED_MODELS["id2label"], _CACHED_MODELS["label2id"]

    mapping_file = TRANSFORMER_DIR / "label_mapping.json"
    if not mapping_file.exists():
        mapping_file = BASELINE_DIR / "label_mapping.json"
    
    if mapping_file.exists():
        with open(mapping_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            _CACHED_MODELS["id2label"] = {int(k): v for k, v in data["id2label"].items()}
            _CACHED_MODELS["label2id"] = data["label2id"]
    else:
        from ml.data.dataset_loader import VALID_CATEGORIES
        _CACHED_MODELS["id2label"] = {i: c for i, c in enumerate(VALID_CATEGORIES)}
        _CACHED_MODELS["label2id"] = {c: i for i, c in enumerate(VALID_CATEGORIES)}

    return _CACHED_MODELS["id2label"], _CACHED_MODELS["label2id"]


def load_transformer():
    if _CACHED_MODELS["transformer"] is not None:
        return _CACHED_MODELS["transformer"], _CACHED_MODELS["tokenizer"], _CACHED_MODELS["device"]

    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _CACHED_MODELS["device"] = device

    if not TRANSFORMER_DIR.exists():
        raise FileNotFoundError(f"Transformer model directory not found at: {TRANSFORMER_DIR}")

    tokenizer = AutoTokenizer.from_pretrained(TRANSFORMER_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(TRANSFORMER_DIR).to(device)
    model.eval()

    _CACHED_MODELS["transformer"] = model
    _CACHED_MODELS["tokenizer"] = tokenizer
    return model, tokenizer, device


def load_baseline():
    if _CACHED_MODELS["baseline_clf"] is not None:
        return _CACHED_MODELS["baseline_clf"], _CACHED_MODELS["baseline_vec"]

    import joblib
    if not (BASELINE_DIR / "classifier.joblib").exists():
        raise FileNotFoundError(f"Baseline classifier not found at: {BASELINE_DIR}")

    clf = joblib.load(BASELINE_DIR / "classifier.joblib")
    vec = joblib.load(BASELINE_DIR / "vectorizer.joblib")
    _CACHED_MODELS["baseline_clf"] = clf
    _CACHED_MODELS["baseline_vec"] = vec
    return clf, vec


def predict(text: str, model_type: str = "transformer", threshold: float = DEFAULT_CONFIDENCE_THRESHOLD) -> dict:
    """
    Classifies raw notice text and returns prediction, probability, candidate breakdown, and review flag.
    """
    if not text or not text.strip():
        return {
            "category": "GENERAL_ANNOUNCEMENT",
            "confidence": 0.0,
            "model": "Fallback",
            "requires_review": True,
            "error": "Empty input text",
            "candidateScores": {}
        }

    id2label, label2id = _load_labels()
    text = text.strip()

    # Try Transformer first if requested
    if model_type == "transformer":
        try:
            import torch
            import numpy as np

            model, tokenizer, device = load_transformer()
            inputs = tokenizer(
                text,
                truncation=True,
                max_length=128,
                padding=True,
                return_tensors="pt"
            ).to(device)

            with torch.no_grad():
                outputs = model(**inputs)
                probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]

            pred_idx = int(np.argmax(probs))
            predicted_category = id2label[pred_idx]
            confidence = float(probs[pred_idx])

            candidate_scores = {
                id2label[i]: float(round(probs[i], 4)) for i in range(len(id2label))
            }
            top_candidates = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:3]

            requires_review = confidence < threshold

            return {
                "category": predicted_category,
                "confidence": round(confidence, 4),
                "model": "DistilBERT",
                "threshold": threshold,
                "requires_review": requires_review,
                "confidence_status": "HIGH" if not requires_review else "LOW",
                "candidateScores": candidate_scores,
                "topCandidates": top_candidates,
            }
        except Exception as e:
            # Gracefully fall back to baseline if transformer fails
            print(f"[predict.py] Transformer error ({e}). Falling back to TF-IDF Baseline...", file=sys.stderr)
            model_type = "baseline"

    # Baseline prediction (TF-IDF + Calibrated Logistic Regression)
    try:
        clf, vec = load_baseline()
        X = vec.transform([text])
        probs = clf.predict_proba(X)[0]
        pred_idx = int(probs.argmax())
        predicted_category = id2label[pred_idx]
        confidence = float(probs[pred_idx])

        candidate_scores = {
            id2label[i]: float(round(probs[i], 4)) for i in range(len(id2label))
        }
        top_candidates = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        requires_review = confidence < threshold

        return {
            "category": predicted_category,
            "confidence": round(confidence, 4),
            "model": "TF-IDF Baseline",
            "threshold": threshold,
            "requires_review": requires_review,
            "confidence_status": "HIGH" if not requires_review else "LOW",
            "candidateScores": candidate_scores,
            "topCandidates": top_candidates,
        }
    except Exception as e:
        return {
            "category": "GENERAL_ANNOUNCEMENT",
            "confidence": 0.0,
            "model": "RuleFallback",
            "threshold": threshold,
            "requires_review": True,
            "error": str(e),
            "candidateScores": {}
        }


def main():
    parser = argparse.ArgumentParser(description="Academic Notice Classifier Prediction CLI")
    parser.add_argument("--text", type=str, help="Academic notice text to classify")
    parser.add_argument("--model", type=str, default="transformer", choices=["transformer", "baseline"])
    parser.add_argument("--threshold", type=float, default=DEFAULT_CONFIDENCE_THRESHOLD)
    parser.add_argument("--stdin", action="store_true", help="Read notice text from standard input")

    args = parser.parse_args()

    input_text = args.text
    if args.stdin or not input_text:
        input_text = sys.stdin.read().strip()

    if not input_text:
        print(json.dumps({"error": "No input text provided"}))
        sys.exit(1)

    result = predict(input_text, model_type=args.model, threshold=args.threshold)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
