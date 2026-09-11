#!/usr/bin/env python3
"""
MEGHNETRA Manifest Generator CLI
================================
Scans `data/raw/*` and `data/*` for physical scientific files across all feeds:
- INSAT-3DR Satellite (data/raw/insat3dr)
- IMDAA Reanalysis (data/raw/imdaa)
- Doppler Weather Radar (data/raw/radar)
- Rain Gauges (data/raw/rainfall)
- Lightning Flashes (data/raw/lightning)
- Hydrological Streamflow (data/raw/hydrology)
- Digital Elevation Model (data/raw/dem)

Generates standardized JSON manifests in `data/manifests/` with:
- Filename, relative path, file size (bytes and MB)
- SHA256 cryptographic checksum
- File format & integrity status
- Timestamps
"""

import sys
import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add workspace root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data.mosdac_client import MOSDACClient


DATASET_DIRECTORIES = {
    "insat3dr": ["data/raw/insat3dr", "data/insat3dr"],
    "imdaa": ["data/raw/imdaa", "data/imdaa"],
    "radar": ["data/raw/radar", "data/radar"],
    "rainfall": ["data/raw/rainfall", "data/rainfall"],
    "lightning": ["data/raw/lightning", "data/lightning"],
    "hydrology": ["data/raw/hydrology", "data/hydrology"],
    "dem": ["data/raw/dem", "data/dem"],
}


def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while chunk := f.read(1048576):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "unreadable"


def generate_dataset_manifest(dataset_key: str, search_paths: List[str]) -> Dict[str, Any]:
    found_files: List[Path] = []
    extensions = ["*.nc", "*.nc4", "*.h5", "*.hdf", "*.tif", "*.tiff", "*.csv", "*.json", "*.txt"]

    resolved_dirs = []
    for p_str in search_paths:
        p = Path(p_str)
        if p.exists():
            resolved_dirs.append(str(p))
            for ext in extensions:
                found_files.extend(p.glob(ext))
                found_files.extend(p.glob(f"**/{ext}"))

    found_files = sorted(list(set([f for f in found_files if f.is_file() and not f.name.startswith(".")])))

    file_records = []
    total_bytes = 0

    for f in found_files:
        size = f.stat().st_size
        total_bytes += size
        val = MOSDACClient.verify_downloaded_file(f)
        sha = compute_sha256(f)

        try:
            rel = str(f.relative_to(Path(".").resolve() if f.is_absolute() else Path(".")))
        except Exception:
            rel = str(f)

        file_records.append({
            "filename": f.name,
            "path": rel,
            "size_bytes": size,
            "size_mb": round(size / (1024 * 1024), 3),
            "sha256": sha,
            "valid": val.get("valid", False),
            "format": val.get("format", f.suffix.lstrip(".").upper()),
            "modified_time": datetime.fromtimestamp(f.stat().st_mtime).isoformat() + "Z",
        })

    manifest = {
        "dataset_key": dataset_key,
        "scanned_directories": resolved_dirs,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "file_count": len(file_records),
        "total_size_mb": round(total_bytes / (1024 * 1024), 3),
        "valid_files_count": sum(1 for r in file_records if r["valid"]),
        "status": "POPULATED" if len(file_records) > 0 else "EMPTY_WAITING_FOR_DATA",
        "files": file_records,
    }

    manifest_out = Path("data/manifests") / f"{dataset_key}_manifest.json"
    manifest_out.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_out, "w", encoding="utf-8") as out:
        json.dump(manifest, out, indent=2)

    return manifest


def main():
    print("=" * 65)
    print("MEGHNETRA — SCIENTIFIC DATASET MANIFEST GENERATOR")
    print("=" * 65)

    summary = {}
    for ds_key, paths in DATASET_DIRECTORIES.items():
        m = generate_dataset_manifest(ds_key, paths)
        summary[ds_key] = {
            "files": m["file_count"],
            "size_mb": m["total_size_mb"],
            "status": m["status"],
        }
        print(f"• {ds_key:12s} | Files: {m['file_count']:4d} | Size: {m['total_size_mb']:8.2f} MB | Status: {m['status']}")

    # Write combined manifests summary
    combined_file = Path("data/manifests/summary_manifest.json")
    with open(combined_file, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "datasets": summary,
            "total_files": sum(s["files"] for s in summary.values()),
            "total_size_mb": round(sum(s["size_mb"] for s in summary.values()), 3),
        }, f, indent=2)

    print("-" * 65)
    print(f"Manifests successfully saved to: data/manifests/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
