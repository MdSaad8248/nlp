"""
Academic NLP Dataset Loader and Validator
==========================================
Integrates Academic_NLP_Dataset_350.csv without modifying the original file.
Validates required columns, category labels, missing values, and produces
reproducible stratified train (70%) / validation (15%) / test (15%) splits.
"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import StratifiedShuffleSplit

# Canonical 11 Category Labels defined by the academic dataset
VALID_CATEGORIES = [
    "ASSIGNMENT",
    "QUIZ",
    "EXAM",
    "PROJECT",
    "PROJECT_REVIEW",
    "CLASS_CHANGE",
    "CLASS_CANCELLATION",
    "ATTENDANCE",
    "ACADEMIC_EVENT",
    "CIRCULAR",
    "GENERAL_ANNOUNCEMENT"
]

REQUIRED_COLUMNS = [
    "id",
    "text",
    "category",
    "course_code",
    "course_name",
    "task",
    "event",
    "date",
    "time",
    "deadline",
    "venue",
    "platform",
    "marks",
    "urgency",
    "condition",
    "relationship",
    "old_date",
    "old_time",
    "entities"
]

VALID_RELATIONSHIPS = [
    "NEW",
    "DUPLICATE",
    "UPDATED",
    "RESCHEDULED",
    "CANCELLED"
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DATASET_PATH = PROJECT_ROOT / "data" / "Academic_NLP_Dataset_350.csv"
ML_DATA_DIR = PROJECT_ROOT / "ml" / "data"
ML_REPORTS_DIR = PROJECT_ROOT / "ml" / "reports"


class AcademicDatasetValidator:
    def __init__(self, csv_path=None):
        self.csv_path = Path(csv_path) if csv_path else DEFAULT_DATASET_PATH
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Academic dataset CSV not found at: {self.csv_path}")

    def load_and_validate(self):
        """Loads dataset in read-only mode and validates strict schema and integrity."""
        # Read CSV without modifying source
        df = pd.read_csv(self.csv_path, dtype=str)
        
        # 1. Validate required columns
        missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Dataset is missing required columns: {missing_cols}")

        # 2. Check for missing essential fields (id, text, category)
        invalid_mask = (
            df["id"].isna() | (df["id"].str.strip() == "") |
            df["text"].isna() | (df["text"].str.strip() == "") |
            df["category"].isna() | (df["category"].str.strip() == "")
        )
        invalid_count = invalid_mask.sum()
        if invalid_count > 0:
            print(f"Warning: {invalid_count} malformed/empty core records detected. Excluding them.")
            df = df[~invalid_mask].copy()

        # 3. Validate category labels against canonical list
        invalid_categories = df[~df["category"].isin(VALID_CATEGORIES)]["category"].unique()
        if len(invalid_categories) > 0:
            raise ValueError(f"Unrecognized category labels found in dataset: {invalid_categories.tolist()}")

        return df

    def compute_statistics(self, df):
        """Computes comprehensive dataset statistics."""
        total_records = len(df)
        records_per_category = df["category"].value_counts().to_dict()
        
        # Course distribution
        course_distribution = (
            df["course_code"].fillna("NONE").value_counts().to_dict()
        )
        course_name_distribution = (
            df["course_name"].fillna("NONE").value_counts().to_dict()
        )
        
        # Relationship distribution
        relationship_distribution = (
            df["relationship"].fillna("UNSPECIFIED").value_counts().to_dict()
        )
        
        # Deadlines & Dates/Times presence
        has_deadline = df["deadline"].notna() & (df["deadline"].str.strip() != "")
        has_date = df["date"].notna() & (df["date"].str.strip() != "")
        has_time = df["time"].notna() & (df["time"].str.strip() != "")
        has_date_or_time = has_date | has_time
        
        # Entity distribution extracted from the entities column
        entity_type_counts = {}
        for ent_str in df["entities"].dropna():
            parts = [p.strip() for p in str(ent_str).split("|") if p.strip()]
            for p in parts:
                if ":" in p:
                    ent_type = p.split(":", 1)[0].strip()
                    entity_type_counts[ent_type] = entity_type_counts.get(ent_type, 0) + 1

        stats = {
            "total_records": int(total_records),
            "records_per_category": {k: int(v) for k, v in records_per_category.items()},
            "course_distribution": {k: int(v) for k, v in course_distribution.items()},
            "course_name_distribution": {k: int(v) for k, v in course_name_distribution.items()},
            "relationship_distribution": {k: int(v) for k, v in relationship_distribution.items()},
            "records_containing_deadlines": int(has_deadline.sum()),
            "records_containing_dates_or_times": int(has_date_or_time.sum()),
            "records_containing_both_date_and_deadline": int((has_date & has_deadline).sum()),
            "entity_distribution": entity_type_counts,
            "categories_list": VALID_CATEGORIES,
        }
        return stats

    def create_stratified_splits(self, df, random_state=42, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15):
        """
        Creates reproducible stratified train (70%), validation (15%), test (15%) split.
        Uses StratifiedShuffleSplit to preserve category balance.
        """
        assert np.isclose(train_ratio + val_ratio + test_ratio, 1.0), "Split ratios must sum to 1.0"

        # Step 1: Split train vs temp (val + test)
        temp_ratio = val_ratio + test_ratio
        sss1 = StratifiedShuffleSplit(n_splits=1, test_size=temp_ratio, random_state=random_state)
        train_idx, temp_idx = next(sss1.split(df, df["category"]))

        df_train = df.iloc[train_idx].copy().reset_index(drop=True)
        df_temp = df.iloc[temp_idx].copy().reset_index(drop=True)

        # Step 2: Split temp into val and test (equal 50/50 split of the 30% temp)
        val_sub_ratio = val_ratio / temp_ratio
        sss2 = StratifiedShuffleSplit(n_splits=1, test_size=1.0 - val_sub_ratio, random_state=random_state)
        val_sub_idx, test_sub_idx = next(sss2.split(df_temp, df_temp["category"]))

        df_val = df_temp.iloc[val_sub_idx].copy().reset_index(drop=True)
        df_test = df_temp.iloc[test_sub_idx].copy().reset_index(drop=True)

        # Verify zero leakage across splits
        train_ids = set(df_train["id"])
        val_ids = set(df_val["id"])
        test_ids = set(df_test["id"])

        assert len(train_ids.intersection(val_ids)) == 0, "Train and Val overlap detected!"
        assert len(train_ids.intersection(test_ids)) == 0, "Train and Test overlap detected!"
        assert len(val_ids.intersection(test_ids)) == 0, "Val and Test overlap detected!"

        split_metadata = {
            "random_seed": random_state,
            "total_records": len(df),
            "train_count": len(df_train),
            "val_count": len(df_val),
            "test_count": len(df_test),
            "train_ratio": train_ratio,
            "val_ratio": val_ratio,
            "test_ratio": test_ratio,
            "train_ids": sorted(list(train_ids)),
            "val_ids": sorted(list(val_ids)),
            "test_ids": sorted(list(test_ids)),
            "train_category_counts": df_train["category"].value_counts().to_dict(),
            "val_category_counts": df_val["category"].value_counts().to_dict(),
            "test_category_counts": df_test["category"].value_counts().to_dict(),
        }

        return df_train, df_val, df_test, split_metadata


def prepare_and_save_data():
    """CLI runner to validate dataset, produce stats, and save splits."""
    ML_DATA_DIR.mkdir(parents=True, exist_ok=True)
    ML_REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    validator = AcademicDatasetValidator()
    df = validator.load_and_validate()
    print(f"Loaded and validated dataset: {len(df)} records across {len(VALID_CATEGORIES)} categories.")

    stats = validator.compute_statistics(df)
    stats_file = ML_REPORTS_DIR / "dataset_statistics.json"
    with open(stats_file, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print(f"Saved dataset statistics to: {stats_file}")

    df_train, df_val, df_test, split_metadata = validator.create_stratified_splits(df, random_state=42)
    
    # Save splits
    df_train.to_csv(ML_DATA_DIR / "train.csv", index=False)
    df_val.to_csv(ML_DATA_DIR / "val.csv", index=False)
    df_test.to_csv(ML_DATA_DIR / "test.csv", index=False)

    metadata_file = ML_DATA_DIR / "split_metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(split_metadata, f, indent=2)
    print(f"Saved stratified splits: Train={len(df_train)}, Val={len(df_val)}, Test={len(df_test)}")
    print(f"Saved split metadata to: {metadata_file}")

    return df_train, df_val, df_test, stats, split_metadata


if __name__ == "__main__":
    prepare_and_save_data()
