w"""
Academic NLP Notice Classifier Training Script
==============================================
Trains two models:
1. Baseline: TF-IDF + Logistic Regression with Calibrated probabilities
2. Transformer: DistilBERT fine-tuned for 11-class sequence classification

Uses the 70% stratified training split and tunes/evaluates on the 15% validation split.
The 15% test split is strictly isolated and NEVER touched in this script.
"""

import os
import json
import joblib
import torch
import numpy as np
import pandas as pd
from pathlib import Path
from torch.utils.data import Dataset, DataLoader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import f1_score, accuracy_score
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    get_linear_schedule_with_warmup
)
from torch.optim import AdamW

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

ML_DIR = PROJECT_ROOT / "ml"
DATA_DIR = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"
BASELINE_DIR = MODELS_DIR / "baseline_tfidf"
TRANSFORMER_DIR = MODELS_DIR / "transformer_distilbert"

# Labels
from ml.data.dataset_loader import VALID_CATEGORIES

LABEL2ID = {cat: idx for idx, cat in enumerate(VALID_CATEGORIES)}
ID2LABEL = {idx: cat for idx, cat in enumerate(VALID_CATEGORIES)}


class NoticeDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.texts = list(texts)
        self.labels = [LABEL2ID[l] for l in labels] if labels is not None else None
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        encoding = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt"
        )
        item = {key: val.squeeze(0) for key, val in encoding.items()}
        if self.labels is not None:
            item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item


def train_baseline(df_train, df_val):
    """Trains TF-IDF + Calibrated Logistic Regression baseline."""
    print("\n--- Training Baseline (TF-IDF + Calibrated Logistic Regression) ---")
    BASELINE_DIR.mkdir(parents=True, exist_ok=True)

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        max_features=2500,
        stop_words="english"
    )
    X_train = vectorizer.fit_transform(df_train["text"])
    y_train = [LABEL2ID[cat] for cat in df_train["category"]]

    base_clf = LogisticRegression(
        C=2.5,
        max_iter=1000,
        class_weight="balanced",
        random_state=42
    )
    # CalibratedClassifierCV ensures genuine calibrated probabilities
    calibrated_clf = CalibratedClassifierCV(estimator=base_clf, cv=3)
    calibrated_clf.fit(X_train, y_train)

    # Evaluate on Validation split
    X_val = vectorizer.transform(df_val["text"])
    y_val = [LABEL2ID[cat] for cat in df_val["category"]]
    val_preds = calibrated_clf.predict(X_val)
    val_acc = accuracy_score(y_val, val_preds)
    val_f1 = f1_score(y_val, val_preds, average="macro")

    print(f"Baseline Validation Accuracy: {val_acc:.4f} | Validation Macro F1: {val_f1:.4f}")

    # Save artifacts
    joblib.dump(vectorizer, BASELINE_DIR / "vectorizer.joblib")
    joblib.dump(calibrated_clf, BASELINE_DIR / "classifier.joblib")
    with open(BASELINE_DIR / "label_mapping.json", "w", encoding="utf-8") as f:
        json.dump({"label2id": LABEL2ID, "id2label": ID2LABEL}, f, indent=2)

    print(f"Saved baseline artifacts to: {BASELINE_DIR}")
    return calibrated_clf, vectorizer


def train_transformer(df_train, df_val, epochs=5, batch_size=16, lr=3e-5):
    """Fine-tunes DistilBERT transformer sequence classifier."""
    print("\n--- Training Transformer (DistilBERT Sequence Classifier) ---")
    TRANSFORMER_DIR.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device for training: {device}")

    model_name = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(VALID_CATEGORIES),
        id2label=ID2LABEL,
        label2id=LABEL2ID
    ).to(device)

    train_dataset = NoticeDataset(df_train["text"], df_train["category"], tokenizer)
    val_dataset = NoticeDataset(df_val["text"], df_val["category"], tokenizer)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    total_steps = len(train_loader) * epochs
    warmup_steps = int(total_steps * 0.1)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps
    )

    best_val_f1 = 0.0
    best_epoch = 0

    for epoch in range(1, epochs + 1):
        model.train()
        total_train_loss = 0.0

        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

            total_train_loss += loss.item()

        avg_train_loss = total_train_loss / len(train_loader)

        # Validation phase
        model.eval()
        val_preds = []
        val_targets = []
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"].to(device)
                attention_mask = batch["attention_mask"].to(device)
                labels = batch["labels"].to(device)

                outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                preds = torch.argmax(outputs.logits, dim=1).cpu().numpy()
                val_preds.extend(preds)
                val_targets.extend(labels.cpu().numpy())

        val_acc = accuracy_score(val_targets, val_preds)
        val_macro_f1 = f1_score(val_targets, val_preds, average="macro", zero_division=0)

        print(
            f"Epoch {epoch}/{epochs} | Train Loss: {avg_train_loss:.4f} | "
            f"Val Acc: {val_acc:.4f} | Val Macro F1: {val_macro_f1:.4f}"
        )

        if val_macro_f1 > best_val_f1 or epoch == 1:
            best_val_f1 = val_macro_f1
            best_epoch = epoch
            print(f"  -> New best model (Macro F1 = {best_val_f1:.4f}). Saving checkpoint...")
            model.save_pretrained(TRANSFORMER_DIR)
            tokenizer.save_pretrained(TRANSFORMER_DIR)

    with open(TRANSFORMER_DIR / "label_mapping.json", "w", encoding="utf-8") as f:
        json.dump({"label2id": LABEL2ID, "id2label": ID2LABEL, "best_epoch": best_epoch, "best_val_f1": float(best_val_f1)}, f, indent=2)

    print(f"Transformer fine-tuning complete. Best model checkpoint saved to: {TRANSFORMER_DIR}")
    return model, tokenizer


def main():
    print("=" * 60)
    print("ACADEMIC COMMUNICATION CLASSIFIER - MODEL TRAINING")
    print("=" * 60)

    train_path = DATA_DIR / "train.csv"
    val_path = DATA_DIR / "val.csv"

    if not train_path.exists() or not val_path.exists():
        print("Training/Validation data splits missing. Generating from dataset loader...")
        from ml.data.dataset_loader import prepare_and_save_data
        prepare_and_save_data()

    df_train = pd.read_csv(train_path)
    df_val = pd.read_csv(val_path)

    print(f"Loaded Train set: {len(df_train)} records | Val set: {len(df_val)} records.")

    # 1. Train Baseline
    train_baseline(df_train, df_val)

    # 2. Train Transformer
    train_transformer(df_train, df_val, epochs=5, batch_size=16, lr=3e-5)

    print("\n✅ All models successfully trained and checkpoints saved locally.")


if __name__ == "__main__":
    main()
