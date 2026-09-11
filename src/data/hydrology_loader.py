"""
MEGHNETRA Hydrology Loader
Handles CWC river discharge, gauge water levels, and reservoir outflows.
Scientific rule: If hydrological gauges are unavailable, never fabricate them.
Flash flood status must explicitly state 'METEOROLOGICAL PROXY ONLY'.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from src.data.dataset_registry import DatasetRegistry


class HydrologyLoader:
    """Loader for streamflow and gauge observation data."""

    def __init__(self, registry: Optional[DatasetRegistry] = None):
        self.registry = registry or DatasetRegistry()
        self.config = self.registry.get_dataset_config("hydrology") or {}

    def get_available_files(self) -> List[Path]:
        return self.registry.discover_files("hydrology")

    def inspect_dataset(self) -> Dict[str, Any]:
        files = self.get_available_files()
        if not files:
            return {
                "source": "CWC / State Hydrological Gauges",
                "status": "NOT_CONNECTED",
                "message": "FLASH FLOOD MODEL STATUS = METEOROLOGICAL PROXY ONLY (No gauge streamflow files supplied)",
                "files_found": 0,
                "audit_results": []
            }

        return {
            "source": "CWC / State Hydrological Gauges",
            "status": "CONNECTED",
            "files_found": len(files),
            "sample_files": [f.name for f in files[:5]],
            "audit_results": []
        }
