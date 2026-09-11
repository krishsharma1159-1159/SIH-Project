"""
MEGHNETRA Dataset Registry
Maintains configuration, connection status, file locators, and variable maps
for all physical meteorological and geophysical datasets.
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Any
import yaml


class DatasetRegistry:
    """Central registry for discovering, validating, and mapping scientific datasets."""

    def __init__(self, config_path: str = "configs/data.yaml"):
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.data_root = Path(self.config.get("data_root", "data"))

    def _load_config(self) -> Dict[str, Any]:
        if not self.config_path.exists():
            return {
                "data_root": "data",
                "datasets": {}
            }
        with open(self.config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def get_dataset_config(self, dataset_name: str) -> Optional[Dict[str, Any]]:
        return self.config.get("datasets", {}).get(dataset_name)

    def list_datasets(self) -> List[str]:
        return list(self.config.get("datasets", {}).keys())

    def discover_files(self, dataset_name: str) -> List[Path]:
        """Discovers all actual files matching patterns for a specified dataset."""
        cfg = self.get_dataset_config(dataset_name)
        if not cfg:
            return []

        dataset_dir = Path(cfg.get("directory", self.data_root / dataset_name))
        if not dataset_dir.exists():
            return []

        patterns = cfg.get("file_patterns", ["*.nc", "*.h5", "*.tif", "*.csv"])
        found_files: List[Path] = []
        for pattern in patterns:
            found_files.extend(dataset_dir.glob(pattern))
            found_files.extend(dataset_dir.glob(f"**/{pattern}"))

        # Return unique, sorted file paths
        return sorted(list(set(found_files)))

    def get_connection_status(self, dataset_name: str) -> Dict[str, Any]:
        """Returns connection status, file count, and directory info."""
        cfg = self.get_dataset_config(dataset_name)
        if not cfg:
            return {
                "name": dataset_name,
                "status": "NOT_REGISTERED",
                "file_count": 0,
                "directory": None,
                "enabled": False,
            }

        dataset_dir = Path(cfg.get("directory", self.data_root / dataset_name))
        files = self.discover_files(dataset_name)

        is_enabled = cfg.get("enabled", False)
        status = "CONNECTED" if len(files) > 0 else ("DIRECTORY_EMPTY" if dataset_dir.exists() else "NOT_CONNECTED")

        return {
            "name": cfg.get("name", dataset_name),
            "source_type": cfg.get("source_type", "unknown"),
            "status": status,
            "file_count": len(files),
            "directory": str(dataset_dir),
            "enabled": is_enabled,
            "file_samples": [str(f.name) for f in files[:3]],
        }

    def get_variable_mapping(self, dataset_name: str) -> Dict[str, List[str]]:
        cfg = self.get_dataset_config(dataset_name)
        if not cfg:
            return {}
        return cfg.get("variable_mapping", {})
