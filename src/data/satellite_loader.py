"""
MEGHNETRA INSAT-3DR Satellite Loader
Specialized for MOSDAC INSAT-3DR/3D Imager and Sounder HDF/NetCDF products.
Handles VIS, SWIR, MIR, WV, TIR1, TIR2, and derived products (QPE, CTT, IWV/UTH).
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from src.data.netcdf_loader import NetCDFLoader
from src.data.dataset_registry import DatasetRegistry


class SatelliteLoader:
    """Specialized loader for INSAT-3DR MOSDAC files."""

    def __init__(self, registry: Optional[DatasetRegistry] = None):
        self.registry = registry or DatasetRegistry()
        self.config = self.registry.get_dataset_config("insat3dr") or {}

    def get_available_files(self) -> List[Path]:
        return self.registry.discover_files("insat3dr")

    def inspect_dataset(self) -> Dict[str, Any]:
        """Audits all available INSAT-3DR files."""
        files = self.get_available_files()
        if not files:
            return {
                "source": "INSAT-3DR MOSDAC",
                "status": "NOT_CONNECTED",
                "message": "No INSAT-3DR (.nc, .h5, .hdf) files found in data/insat3dr",
                "files_found": 0,
                "audit_results": []
            }

        results = []
        for file_path in files[:10]: # Audit up to 10 files in detail
            results.append(NetCDFLoader.inspect_file(file_path))

        return {
            "source": "INSAT-3DR MOSDAC",
            "status": "CONNECTED",
            "files_found": len(files),
            "files_audited": len(results),
            "sample_files": [f.name for f in files[:5]],
            "audit_results": results
        }
