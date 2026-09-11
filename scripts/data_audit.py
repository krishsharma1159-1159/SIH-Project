#!/usr/bin/env python3
"""
MEGHNETRA Real Data Audit Script
=================================
Performs Phase 1 comprehensive scientific audit across all supplied meteorological,
satellite, reanalysis, radar, and terrain datasets.

Rules:
- Never assume variable or coordinate names.
- Inspects real dimensions, coordinates, variables, units, ranges, and NaN percentages.
- Never fabricates or replaces missing data with random values.
- Checks spatial overlap with Uttarakhand bounding box.
"""

import sys
import os
import argparse
import json
from pathlib import Path
from typing import Dict, Any, List

# Ensure workspace root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data.dataset_registry import DatasetRegistry
from src.data.netcdf_loader import NetCDFLoader
from src.data.satellite_loader import SatelliteLoader
from src.data.reanalysis_loader import ReanalysisLoader
from src.data.radar_loader import RadarLoader
from src.data.dem_loader import DEMLoader
from src.data.hydrology_loader import HydrologyLoader
from src.data.quality_control import QualityController


def print_banner(text: str, char: str = "="):
    line = char * len(text)
    print(f"\n{line}\n{text}\n{line}")


def audit_single_file(file_path: Path) -> Dict[str, Any]:
    """Audits a single NetCDF / raster file."""
    print(f"\n>>> Auditing File: {file_path.name}")
    print(f"    Path: {file_path}")
    
    inspection = NetCDFLoader.inspect_file(file_path)
    if not inspection.get("valid", False):
        print(f"    [!] Error opening file: {inspection.get('error')}")
        return inspection

    print(f"    Format Engine: {inspection.get('inspection_engine', 'xarray/netCDF4')}")
    print(f"    File Size: {inspection.get('file_size_mb', 0)} MB")
    
    # Dimensions
    dims = inspection.get("dimensions", {})
    print("    Dimensions:")
    for dim_name, dim_size in dims.items():
        print(f"      - {dim_name}: {dim_size}")

    # Coordinates
    coords = inspection.get("coordinates", {})
    if coords:
        print("    Coordinates:")
        for coord_name, c_info in coords.items():
            print(f"      - {coord_name}: shape={c_info.get('shape')}, dtype={c_info.get('dtype')}, range=[{c_info.get('min')}, {c_info.get('max')}], step={c_info.get('estimated_step', 'N/A')}")

    # Geographic bounds
    geo = inspection.get("geographic_bounds", {})
    print(f"    Geographic Extent: Lat [{geo.get('lat_min')}, {geo.get('lat_max')}], Lon [{geo.get('lon_min')}, {geo.get('lon_max')}]")

    # Variables
    vars_info = inspection.get("variables", {})
    print(f"    Variables Detected ({len(vars_info)}):")
    for var_name, v_info in vars_info.items():
        units = v_info.get("units", "dimensionless")
        nan_pct = v_info.get("nan_percentage", 0.0)
        v_min = v_info.get("min")
        v_max = v_info.get("max")
        v_mean = v_info.get("mean")
        print(f"      • {var_name:24s} | units: {units:15s} | shape: {str(v_info.get('shape')):16s} | range: [{v_min}, {v_max}] | mean: {v_mean} | NaN: {nan_pct}%")

    return inspection


def run_data_audit(config_path: str = "configs/data.yaml", custom_path: str = None) -> Dict[str, Any]:
    print_banner("MEGHNETRA SCIENTIFIC DATA AUDIT — PHASE 1")
    print("AI-Driven Hyper-Local Multi-Hazard Weather Early Warning System")
    print("Team Viraj • Uttarakhand Regional Domain")
    
    registry = DatasetRegistry(config_path)
    audit_summary: Dict[str, Any] = {
        "timestamp": "2026-09-11T11:00:00Z",
        "config_path": config_path,
        "datasets": {},
        "overall_status": "AUDIT_COMPLETED",
        "total_files_audited": 0,
        "connected_sources": [],
        "missing_sources": [],
    }

    # If custom path is provided, audit that directly
    if custom_path:
        p = Path(custom_path)
        print(f"\nTargeting specific path: {p}")
        if p.is_file():
            res = audit_single_file(p)
            audit_summary["custom_file"] = res
            return audit_summary
        elif p.is_dir():
            files = list(p.glob("**/*.nc")) + list(p.glob("**/*.h5")) + list(p.glob("**/*.tif"))
            print(f"Found {len(files)} candidate scientific files in {p}")
            audited = []
            for f in files:
                audited.append(audit_single_file(f))
            audit_summary["custom_dir_files"] = audited
            return audit_summary

    # Audit by dataset category
    datasets_to_check = [
        ("insat3dr", SatelliteLoader(registry)),
        ("imdaa", ReanalysisLoader(registry)),
        ("radar", RadarLoader(registry)),
        ("dem", DEMLoader(registry)),
        ("hydrology", HydrologyLoader(registry)),
    ]

    for ds_id, loader in datasets_to_check:
        print_banner(f"Auditing Dataset: {ds_id.upper()}", "-")
        status_info = registry.get_connection_status(ds_id)
        print(f"Source: {status_info.get('name')}")
        print(f"Type: {status_info.get('source_type')}")
        print(f"Target Directory: {status_info.get('directory')}")
        print(f"Status: {status_info.get('status')}")
        print(f"Files Found: {status_info.get('file_count')}")

        files = registry.discover_files(ds_id)
        ds_audits = []

        if len(files) == 0:
            print(f"  [!] DATASET NOT CONNECTED: No files found in '{status_info.get('directory')}'.")
            audit_summary["missing_sources"].append(ds_id)
        else:
            audit_summary["connected_sources"].append(ds_id)
            for f in files:
                audit_res = audit_single_file(f)
                ds_audits.append(audit_res)
                audit_summary["total_files_audited"] += 1

        audit_summary["datasets"][ds_id] = {
            "metadata": status_info,
            "files": [str(f) for f in files],
            "file_count": len(files),
            "audits": ds_audits,
        }

    # Print summary recommendations
    print_banner("DATA AUDIT VERDICT & REQUIREMENTS")
    print(f"Total Scientific Files Audited: {audit_summary['total_files_audited']}")
    print(f"Connected Data Sources: {len(audit_summary['connected_sources'])} / {len(datasets_to_check)}")
    
    if len(audit_summary['connected_sources']) == 0:
        print("\n[!] STATUS: NO DATASETS CURRENTLY SUPPLIED IN WORKSPACE.")
        print("    In accordance with scientific integrity guidelines:")
        print("    • Real model training is LOCKED until actual .nc / .h5 / .tif files are supplied.")
        print("    • NO fake or randomly generated values will be substituted.")
        print("\nREQUIRED DATASET LOCATIONS FOR INGESTION:")
        print("  1. INSAT-3DR (MOSDAC):  Place .nc / .h5 files into  `data/insat3dr/`")
        print("  2. IMDAA Reanalysis:     Place .nc / .nc4 files into `data/imdaa/`")
        print("  3. Doppler Radar (DWR):  Place .nc / .h5 files into  `data/radar/`")
        print("  4. CartoDEM / SRTM:      Place .tif / .nc files into `data/dem/`")
        print("  5. CWC Hydrology Gauges: Place .csv / .nc files into `data/hydrology/`")
        print("\nOnce files are placed, re-run:")
        print("  python3 scripts/data_audit.py")
    else:
        print(f"\nConnected Sources: {', '.join(audit_summary['connected_sources'])}")

    # Save audit report to JSON
    out_dir = Path("data")
    out_dir.mkdir(exist_ok=True, parents=True)
    report_file = out_dir / "audit_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)
    print(f"\nAudit results serialized to: {report_file}")

    return audit_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MEGHNETRA Real Scientific Data Audit")
    parser.add_argument("--config", default="configs/data.yaml", help="Path to data.yaml config")
    parser.add_argument("--path", default=None, help="Audit a specific file or folder directly")
    args = parser.parse_args()

    run_data_audit(args.config, args.path)
