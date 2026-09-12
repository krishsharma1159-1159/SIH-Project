#!/usr/bin/env python3
"""MeghNetra External Dataset Verification Script.

Verifies that the external NetCDF datasets and model directory
configured in backend/config.py are accessible, exists on disk,
and can have their metadata read without loading the 30+ GB dataset into RAM.
"""
import sys
from pathlib import Path

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.config import (
    CLUSTERING_DATA_PATH,
    PSEUDO_LABEL_DATA_PATH,
    CHUNKED_DATA_PATH,
    MODEL_DIR,
    print_data_configuration,
    validate_datasets,
)


def main():
    # 1. Print standard required output
    print_data_configuration()

    # 2. Check metadata header readability without loading data into memory
    status = validate_datasets(check_open=True)

    if "metadata" in status:
        print("\nMetadata Verification (Header only, 0 bytes array payload loaded):")
        for dataset_key, meta in status["metadata"].items():
            print(f"  - {dataset_key}: {meta['variables_count']} variables, dimensions: {meta['dimensions']}")
    elif "metadata_error" in status:
        print(f"\nMetadata check warning: {status['metadata_error']}")

    if not (status["clustering_ready"] and status["pseudo_labels"] and status["chunked_dataset"]):
        print(f"\nResult: {status['status']}")
        sys.exit(1)
    else:
        print("\nResult: All 3 external NetCDF datasets successfully verified.")


if __name__ == "__main__":
    main()
