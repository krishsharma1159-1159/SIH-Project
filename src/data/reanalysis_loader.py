"""
MEGHNETRA IMDAA High-Resolution Reanalysis Loader
Specialized for NCMRWF IMDAA hourly reanalysis NetCDF files.
Maps thermodynamic and dynamic variables across pressure/surface levels.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from src.data.netcdf_loader import NetCDFLoader
from src.data.dataset_registry import DatasetRegistry


class ReanalysisLoader:
    """Specialized loader for IMDAA reanalysis files."""

    def __init__(self, registry: Optional[DatasetRegistry] = None):
        self.registry = registry or DatasetRegistry()
        self.config = self.registry.get_dataset_config("imdaa") or {}

    def get_available_files(self) -> List[Path]:
        return self.registry.discover_files("imdaa")

    def inspect_dataset(self) -> Dict[str, Any]:
        """Audits all available IMDAA files."""
        files = self.get_available_files()
        if not files:
            return {
                "source": "IMDAA Reanalysis",
                "status": "NOT_CONNECTED",
                "message": "No IMDAA (.nc, .nc4) files found in data/imdaa",
                "files_found": 0,
                "audit_results": []
            }

        results = []
        for file_path in files[:10]:
            results.append(NetCDFLoader.inspect_file(file_path))

        return {
            "source": "IMDAA Reanalysis",
            "status": "CONNECTED",
            "files_found": len(files),
            "files_audited": len(results),
            "sample_files": [f.name for f in files[:5]],
            "audit_results": results
        }
