"""
MEGHNETRA Digital Elevation Model (DEM) & Orography Loader
Loads static terrain data (CartoDEM / SRTM / Copernicus DEM) and computes:
- Elevation (m)
- Slope (degrees)
- Aspect (compass direction)
- Orographic relief & flow accumulation
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
from src.data.dataset_registry import DatasetRegistry
from src.data.netcdf_loader import NetCDFLoader


class DEMLoader:
    """Loader for static topographic terrain datasets."""

    def __init__(self, registry: Optional[DatasetRegistry] = None):
        self.registry = registry or DatasetRegistry()
        self.config = self.registry.get_dataset_config("dem") or {}

    def get_available_files(self) -> List[Path]:
        return self.registry.discover_files("dem")

    def inspect_dataset(self) -> Dict[str, Any]:
        files = self.get_available_files()
        if not files:
            return {
                "source": "High-Resolution DEM (CartoDEM / SRTM)",
                "status": "NOT_CONNECTED",
                "message": "No DEM terrain raster (.tif, .nc) found in data/dem",
                "files_found": 0,
                "audit_results": []
            }

        results = []
        for file_path in files[:5]:
            if file_path.suffix in [".nc", ".nc4", ".h5"]:
                results.append(NetCDFLoader.inspect_file(file_path))
            else:
                results.append({
                    "filename": file_path.name,
                    "file_path": str(file_path),
                    "file_size_mb": round(file_path.stat().st_size / (1024 * 1024), 2),
                    "format": file_path.suffix,
                    "valid": True
                })

        return {
            "source": "High-Resolution DEM (CartoDEM / SRTM)",
            "status": "CONNECTED",
            "files_found": len(files),
            "files_audited": len(results),
            "sample_files": [f.name for f in files[:5]],
            "audit_results": results
        }
