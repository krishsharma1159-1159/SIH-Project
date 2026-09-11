"""
MEGHNETRA Lightning Detection Loader
Specialized for IITM Damini / ISRO / Earth Networks lightning stroke data (.csv, .nc, .json).
Monitors total lightning (intra-cloud + cloud-to-ground) jump indicators for severe convection.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from src.data.dataset_registry import DatasetRegistry
from src.data.netcdf_loader import NetCDFLoader


class LightningLoader:
    """Specialized loader for lightning stroke and flash density data."""

    def __init__(self, registry: Optional[DatasetRegistry] = None):
        self.registry = registry or DatasetRegistry()
        self.config = self.registry.get_dataset_config("lightning") or {
            "name": "Lightning Location Network (IITM / Damini / EN)",
            "source_type": "lightning",
            "directory": "data/raw/lightning",
            "file_patterns": ["*.csv", "*.nc", "*.json"],
        }

    def get_available_files(self) -> List[Path]:
        raw_dir = Path("data/raw/lightning")
        legacy_dir = Path("data/lightning")
        files: List[Path] = []
        for d in [raw_dir, legacy_dir]:
            if d.exists():
                for pat in ["*.csv", "*.nc", "*.json", "*.txt"]:
                    files.extend(d.glob(pat))
                    files.extend(d.glob(f"**/{pat}"))
        return sorted(list(set(files)))

    def inspect_dataset(self) -> Dict[str, Any]:
        files = self.get_available_files()
        if not files:
            return {
                "source": "Lightning Detection Network",
                "status": "NOT_CONNECTED",
                "message": "No lightning files found in data/raw/lightning",
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
            "source": "Lightning Detection Network",
            "status": "CONNECTED",
            "files_found": len(files),
            "sample_files": [f.name for f in files[:5]],
            "audit_results": results,
        }
