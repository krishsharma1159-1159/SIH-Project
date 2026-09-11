"""
MEGHNETRA Feature Normalization Engine
Learns normalization parameters strictly from the training split.
Persists scalers to artifacts/scalers/ to guarantee train/inference identity.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np


class FeatureScaler:
    """Manages feature-level scaling statistics."""

    def __init__(self, scaler_path: Optional[str] = "artifacts/scalers/training_scaler.json"):
        self.scaler_path = Path(scaler_path) if scaler_path else None
        self.stats: Dict[str, Dict[str, float]] = {}

    def fit_from_train_split(self, train_data: Dict[str, np.ndarray]):
        """Computes mean and std strictly on training arrays."""
        self.stats = {}
        for feature_name, arr in train_data.items():
            valid = arr[~np.isnan(arr)]
            if len(valid) == 0:
                mean_val, std_val = 0.0, 1.0
            else:
                mean_val = float(np.mean(valid))
                std_val = float(np.std(valid))
                if std_val < 1e-6:
                    std_val = 1.0  # Prevent divide-by-zero on constant fields

            self.stats[feature_name] = {
                "mean": mean_val,
                "std": std_val,
                "min": float(np.min(valid)) if len(valid) else 0.0,
                "max": float(np.max(valid)) if len(valid) else 1.0,
            }

        if self.scaler_path:
            self.save()

    def transform(self, feature_name: str, arr: np.ndarray) -> np.ndarray:
        """Applies learned scaling."""
        if feature_name not in self.stats:
            raise KeyError(f"Feature '{feature_name}' not found in fitted scaler statistics.")
        s = self.stats[feature_name]
        return (arr - s["mean"]) / s["std"]

    def inverse_transform(self, feature_name: str, arr: np.ndarray) -> np.ndarray:
        """Reverses scaling back to physical canonical units."""
        if feature_name not in self.stats:
            raise KeyError(f"Feature '{feature_name}' not found in scaler statistics.")
        s = self.stats[feature_name]
        return (arr * s["std"]) + s["mean"]

    def save(self):
        if not self.scaler_path:
            return
        self.scaler_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.scaler_path, "w", encoding="utf-8") as f:
            json.dump(self.stats, f, indent=2)

    def load(self):
        if not self.scaler_path or not self.scaler_path.exists():
            raise FileNotFoundError(f"Scaler statistics file not found at: {self.scaler_path}")
        with open(self.scaler_path, "r", encoding="utf-8") as f:
            self.stats = json.load(f)
