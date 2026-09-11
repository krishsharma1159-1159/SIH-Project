"""
MEGHNETRA In-situ Rainfall Loader
Specialized for IMD Automatic Weather Station (AWS) / Automatic Rain Gauge (ARG)
and State Disaster Management Authority (USDMA) rainfall data (.csv, .nc, .json).
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from src.data.dataset_registry import DatasetRegistry
from src.data.netcdf_loader import NetCDFLoader


class RainfallLoader:
    """Specialized loader for in-situ gauge rainfall observations."""

    def __init__(self, registry: Optional[DatasetRegistry] = None):
        self.registry = registry or DatasetRegistry()
        self.config = self.registry.get_dataset_config("rainfall") or {
            "name": "In-situ Automatic Rain Gauges (AWS/ARG)",
            "source_type": "in_situ",
            "directory": "data/raw/rainfall",
            "file_patterns": ["*.csv", "*.nc", "*.txt"],
        }

    def get_available_files(self) -> List[Path]:
        raw_dir = Path("data/raw/rainfall")
        legacy_dir = Path("data/rainfall")
        files: List[Path] = []
        for d in [raw_dir, legacy_dir]:
            if d.exists():
                for pat in ["*.csv", "*.nc", "*.txt", "*.json"]:
                    files.extend(d.glob(pat))
                    files.extend(d.glob(f"**/{pat}"))
        return sorted(list(set(files)))

    def inspect_dataset(self) -> Dict[str, Any]:
        files = self.get_available_files()
        if not files:
            return {
                "source": "In-situ Rainfall Gauges (AWS/ARG)",
                "status": "NOT_CONNECTED",
                "message": "No rainfall files found in data/raw/rainfall",
                "files_found": 0,
                "audit_results": [],
            }

        results = []
        for file_path in files[:10]:
            if file_path.suffix.lower() == ".nc":
                results.append(NetCDFLoader.inspect_file(file_path))
            else:
                results.append({
                    "file_name": file_path.name,
                    "format": file_path.suffix.lstrip(".").upper(),
                    "size_bytes": file_path.stat().st_size,
                    "valid": file_path.stat().st_size > 0,
                })

        return {
            "source": "In-situ Rainfall Gauges (AWS/ARG)",
            "status": "CONNECTED",
            "files_found": len(files),
            "sample_files": [f.name for f in files[:5]],
            "audit_results": results,
        }
