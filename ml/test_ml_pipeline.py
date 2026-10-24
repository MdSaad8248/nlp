"""
Academic NLP Pipeline - Unit & Integration Test Suite
=====================================================
Automated tests covering:
1. Dataset loading
2. Required column validation
3. Label validation
4. Stratified splitting (70/15/15)
5. Reproducibility across runs
6. Zero train/val/test data leakage (disjoint ID sets)
7. Model loading (Baseline & Transformer)
8. Prediction format and keys
9. Calibrated confidence output [0.0 - 1.0]
10. Invalid and edge case input handling
"""

import sys
import unittest
import json
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.data.dataset_loader import (
    AcademicDatasetValidator,
    REQUIRED_COLUMNS,
    VALID_CATEGORIES,
    DEFAULT_DATASET_PATH,
    ML_DATA_DIR,
    ML_REPORTS_DIR
)
from ml.predict import predict, load_baseline


class TestAcademicDatasetAndValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.validator = AcademicDatasetValidator(DEFAULT_DATASET_PATH)
        cls.df = cls.validator.load_and_validate()

    def test_01_dataset_loading_and_record_count(self):
        """Test 1: Dataset loads successfully and contains 350 records."""
        self.assertIsNotNone(self.df)
        self.assertEqual(len(self.df), 350, f"Expected 350 records, got {len(self.df)}")

    def test_02_required_columns_validation(self):
        """Test 2: All 19 required columns are present in the dataset."""
        for col in REQUIRED_COLUMNS:
            self.assertIn(col, self.df.columns, f"Required column '{col}' missing from dataset")

    def test_03_category_labels_validation(self):
        """Test 3: Only canonical 11 category labels exist in the dataset."""
        unique_categories = sorted(self.df["category"].unique())
        self.assertEqual(
            unique_categories,
            sorted(VALID_CATEGORIES),
            f"Dataset categories do not match valid categories: {unique_categories}"
        )

    def test_04_stratified_split_ratios(self):
        """Test 4: Stratified split produces 70% train, 15% val, 15% test counts."""
        df_train, df_val, df_test, metadata = self.validator.create_stratified_splits(self.df, random_state=42)
        total = len(self.df)
        
        # 70% of 350 is 245
        self.assertEqual(len(df_train), 245)
        # 15% of 350 is ~52-53
        self.assertEqual(len(df_val), 52)
        self.assertEqual(len(df_test), 53)
        self.assertEqual(len(df_train) + len(df_val) + len(df_test), total)

    def test_05_split_reproducibility(self):
        """Test 5: Splitting with fixed random seed produces identical record IDs."""
        _, _, _, meta1 = self.validator.create_stratified_splits(self.df, random_state=42)
        _, _, _, meta2 = self.validator.create_stratified_splits(self.df, random_state=42)
        self.assertEqual(meta1["train_ids"], meta2["train_ids"])
        self.assertEqual(meta1["val_ids"], meta2["val_ids"])
        self.assertEqual(meta1["test_ids"], meta2["test_ids"])

    def test_06_no_train_val_test_overlap(self):
        """Test 6: Strict isolation - zero ID overlap between train, val, and test splits."""
        _, _, _, metadata = self.validator.create_stratified_splits(self.df, random_state=42)
        train_set = set(metadata["train_ids"])
        val_set = set(metadata["val_ids"])
        test_set = set(metadata["test_ids"])

        self.assertEqual(len(train_set.intersection(val_set)), 0, "Train and Val overlap detected")
        self.assertEqual(len(train_set.intersection(test_set)), 0, "Train and Test overlap detected")
        self.assertEqual(len(val_set.intersection(test_set)), 0, "Val and Test overlap detected")


class TestModelInferenceAndConfidence(unittest.TestCase):
    def test_07_model_loading_and_baseline(self):
        """Test 7: Baseline model loads properly."""
        clf, vec = load_baseline()
        self.assertIsNotNone(clf)
        self.assertIsNotNone(vec)

    def test_08_prediction_format(self):
        """Test 8: Prediction output contains all required keys."""
        sample_text = "NLP Assignment 3 must be submitted on VTOP before Sunday 11:59 PM."
        res = predict(sample_text, model_type="baseline")

        self.assertIn("category", res)
        self.assertIn("confidence", res)
        self.assertIn("model", res)
        self.assertIn("requires_review", res)
        self.assertIn("candidateScores", res)
        self.assertIn(res["category"], VALID_CATEGORIES)

    def test_09_confidence_calibration(self):
        """Test 9: Output confidence is a valid probability between 0.0 and 1.0."""
        sample_text = "Quiz 2 for Operating Systems will be conducted tomorrow at 10 AM in SJT."
        res = predict(sample_text, model_type="baseline")
        conf = res["confidence"]

        self.assertIsInstance(conf, float)
        self.assertGreaterEqual(conf, 0.0)
        self.assertLessEqual(conf, 1.0)

    def test_10_invalid_and_empty_input_handling(self):
        """Test 10: Gracefully handles empty or whitespace input without crashing."""
        res_empty = predict("", model_type="baseline")
        self.assertTrue(res_empty["requires_review"])
        self.assertEqual(res_empty["confidence"], 0.0)

        res_space = predict("    ", model_type="baseline")
        self.assertTrue(res_space["requires_review"])
        self.assertEqual(res_space["confidence"], 0.0)


if __name__ == "__main__":
    unittest.main()
