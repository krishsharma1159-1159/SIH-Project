"""
MEGHNETRA Weather Radar Loader
Handles Doppler Weather Radar (DWR) reflectivity (dBZ), radial velocity, and QPE.
Scientific rule: Never simulate or fabricate radar data. Report NOT CONNECTED if absent.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from src.data.dataset_registry import DatasetRegistry


class RadarLoader:
    """Loader for IMD Doppler Weather Radar datasets."""

    def __init__(self, registry: Optional[DatasetRegistry] = None):
        self.registry = registry or DatasetRegistry()
        self.config = self.registry.get_dataset_config("radar") or {}

    def get_available_files(self) -> List[Path]:
        return self.registry.discover_files("radar")

    def inspect_dataset(self) -> Dict[str, Any]:
        files = self.get_available_files()
        if not files:
            return {
                "source": "IMD Doppler Weather Radar (DWR)",
                "status": "NOT_CONNECTED",
                "message": "Radar: NOT CONNECTED (No Doppler radar files supplied)",
                "files_found": 0,
                "audit_results": []
            }

        return {
            "source": "IMD Doppler Weather Radar (DWR)",
            "status": "CONNECTED",
            "files_found": len(files),
            "sample_files": [f.name for f in files[:5]],
            "audit_results": []
        }
