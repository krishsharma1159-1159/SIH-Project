"""MeghNetra Centralized Configuration Module.

Single source of truth for external dataset paths, model assets,
and dataset validation.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict

# Automatically load environment variables from repository root .env
try:
    from dotenv import load_dotenv
    _repo_root = Path(__file__).resolve().parent.parent
    load_dotenv(_repo_root / ".env")
    load_dotenv()  # Also check current working directory
except ImportError:
    pass

# Base repository root
REPO_ROOT: Path = Path(__file__).resolve().parent.parent

# Central data directory (external from git repository)
_raw_data_dir = os.getenv("MEGHNETRA_DATA_DIR", "F:/MODEL_DATA")
DATA_DIR: Path = Path(_raw_data_dir)

# Model directory
_raw_model_dir = os.getenv("MEGHNETRA_MODEL_DIR", str(REPO_ROOT / "model_assets"))
_model_path = Path(_raw_model_dir)
MODEL_DIR: Path = _model_path if _model_path.is_absolute() else (REPO_ROOT / _model_path).resolve()

# Key NetCDF Dataset paths
CLUSTERING_DATA_PATH: Path = DATA_DIR / "clustering_ready.nc"
PSEUDO_LABEL_DATA_PATH: Path = DATA_DIR / "pseudo_labeled_1990_2020.nc"
CHUNKED_DATA_PATH: Path = DATA_DIR / "pseudo_labeled_1990_2020_chunked.nc"


def get_data_dir() -> Path:
    """Return the resolved data directory path."""
    return DATA_DIR


def get_model_dir() -> Path:
    """Return the resolved model assets directory path."""
    return MODEL_DIR


def validate_datasets(check_open: bool = False) -> Dict[str, Any]:
    """Validate existence and accessibility of external NetCDF datasets.

    Args:
        check_open: If True, opens NetCDF headers using netCDF4 in read-only
                    mode to confirm valid dataset format without loading data.

    Returns:
        Dictionary detailing directory and dataset availability.
        If any dataset is missing, does not crash; reports status and missing files.
    """
    data_dir_exists = DATA_DIR.exists() and DATA_DIR.is_dir()
    clustering_exists = CLUSTERING_DATA_PATH.is_file()
    pseudo_labels_exists = PSEUDO_LABEL_DATA_PATH.is_file()
    chunked_dataset_exists = CHUNKED_DATA_PATH.is_file()

    missing_files = []
    if not clustering_exists:
        missing_files.append("clustering_ready.nc")
    if not pseudo_labels_exists:
        missing_files.append("pseudo_labeled_1990_2020.nc")
    if not chunked_dataset_exists:
        missing_files.append("pseudo_labeled_1990_2020_chunked.nc")

    all_found = data_dir_exists and len(missing_files) == 0

    if all_found:
        status_message = "ALL DATASETS AVAILABLE"
    elif not data_dir_exists:
        status_message = f"DATA NOT AVAILABLE: Directory '{DATA_DIR}' does not exist"
    else:
        status_message = f"DATA NOT AVAILABLE: Missing {', '.join(missing_files)}"

    result: Dict[str, Any] = {
        "data_directory": str(DATA_DIR).replace("\\", "/"),
        "clustering_ready": clustering_exists,
        "pseudo_labels": pseudo_labels_exists,
        "chunked_dataset": chunked_dataset_exists,
        "status": status_message,
        "missing_files": missing_files,
    }

    if check_open and all_found:
        metadata_status = {}
        try:
            import netCDF4 as nc4
            for key, path in [
                ("clustering_ready", CLUSTERING_DATA_PATH),
                ("pseudo_labels", PSEUDO_LABEL_DATA_PATH),
                ("chunked_dataset", CHUNKED_DATA_PATH),
            ]:
                with nc4.Dataset(path, "r") as ds:
                    metadata_status[key] = {
                        "dimensions": list(ds.dimensions.keys()),
                        "variables_count": len(ds.variables),
                    }
            result["metadata"] = metadata_status
        except Exception as err:
            result["metadata_error"] = str(err)

    return result


def print_data_configuration() -> None:
    """Print standard formatted configuration overview."""
    status = validate_datasets()
    data_dir_str = str(DATA_DIR).replace("\\", "/")
    model_dir_str = str(MODEL_DIR).replace("\\", "/")

    print("MEGHNETRA DATA CONFIGURATION")
    print()
    print("Data directory:")
    print(data_dir_str)
    print()
    print("clustering_ready.nc:")
    print("FOUND" if status["clustering_ready"] else "NOT FOUND")
    print()
    print("pseudo_labeled_1990_2020.nc:")
    print("FOUND" if status["pseudo_labels"] else "NOT FOUND")
    print()
    print("pseudo_labeled_1990_2020_chunked.nc:")
    print("FOUND" if status["chunked_dataset"] else "NOT FOUND")
    print()
    print("Model directory:")
    print(model_dir_str)


if __name__ == "__main__":
    print_data_configuration()
