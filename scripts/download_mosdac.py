#!/usr/bin/env python3
"""
MOSDAC Real INSAT-3DR Satellite Downloader CLI
==============================================
Connects to official ISRO SAC MOSDAC download API to ingest genuine
geostationary satellite granules into `data/raw/insat3dr/`.

Security & Integrity:
- Credentials loaded safely from MOSDAC_USERNAME and MOSDAC_PASSWORD in .env
- Passwords are NEVER printed, logged, or serialized.
- Zero fake data substitution.
- Automatically generates manifest with SHA256 hashes and file size validation.

Usage:
  python3 scripts/download_mosdac.py --dataset_id 3RIMG_L1B_STD --limit 5
"""

import sys
import os
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Ensure workspace root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Load environment
load_dotenv()

from src.data.mosdac_client import MOSDACClient


def main():
    parser = argparse.ArgumentParser(description="Download authentic INSAT-3DR data from ISRO MOSDAC")
    parser.add_argument(
        "--dataset_id",
        type=str,
        default="3RIMG_L1B_STD",
        help="MOSDAC dataset ID (e.g., 3RIMG_L1B_STD, 3RIMG_L2B_HEM, 3RIMG_L2G_RAIN, 3RSND_L2B_PRFL)",
    )
    parser.add_argument(
        "--start_date",
        type=str,
        default=None,
        help="Start date filter (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--end_date",
        type=str,
        default=None,
        help="End date filter (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="data/raw/insat3dr",
        help="Directory to store ingested granules",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of granules to download",
    )
    parser.add_argument(
        "--bbox",
        type=str,
        default="77.5,28.5,81.2,31.5",
        help="Geographic bounding box minLon,minLat,maxLon,maxLat (Uttarakhand domain)",
    )
    parser.add_argument(
        "--no_date_folders",
        action="store_true",
        help="Do not organize downloaded files into Year/MonthDay subfolders",
    )

    args = parser.parse_args()

    print("=" * 70)
    print("MEGHNETRA — MOSDAC DATA INGESTION ENGINE")
    print("AI-Driven Hyper-Local Weather Early Warning System • Team Viraj")
    print("=" * 70)

    username = os.getenv("MOSDAC_USERNAME", "").strip()
    password = os.getenv("MOSDAC_PASSWORD", "").strip()

    if not username or not password:
        print("\n[!] AUTHENTICATION REQUIRED:")
        print("    MOSDAC requires registered credentials to download satellite granules.")
        print("    To configure credentials securely:")
        print("      1. Register at: https://mosdac.gov.in/signup")
        print("      2. Add credentials to your `.env` file:")
        print("         MOSDAC_USERNAME=your_email@example.com")
        print("         MOSDAC_PASSWORD=your_secret_password")
        print("\n    Note: Passwords are kept confidential and are never exposed.")
        print("    Status: DATA_INGESTION_PENDING (Waiting for MOSDAC credentials)\n")
        return 1

    client = MOSDACClient(username=username, password=password)

    print(f"Connecting to MOSDAC for user: {username}")
    auth = client.authenticate()

    if not auth.get("success"):
        print(f"\n[!] MOSDAC Authentication Error: {auth.get('error', 'MOSDAC_AUTH_FAILED')}")
        print(f"    Details: {auth.get('message')}")
        print("    Status: DATA_INGESTION_PENDING (Invalid MOSDAC credentials)")
        return 1

    print("[✓] MOSDAC Authenticated Successfully.")
    print(f"Starting batch download for dataset '{args.dataset_id}'...")
    print(f"Destination: {args.output_dir}")

    res = client.batch_download(
        dataset_id=args.dataset_id,
        start_date=args.start_date,
        end_date=args.end_date,
        bounding_box=args.bbox,
        output_dir=args.output_dir,
        max_files=args.limit,
        organize_by_date=not args.no_date_folders,
    )

    if not res.get("success"):
        print(f"\n[!] Ingestion Error: {res.get('error')}")
        print(f"    Message: {res.get('message')}")
        return 1

    print("\n" + "=" * 70)
    print("MOSDAC INGESTION SUMMARY")
    print("=" * 70)
    print(f"Total Granules Found:       {res.get('total_found', 0)}")
    print(f"Processed:                  {res.get('processed', 0)}")
    print(f"Newly Downloaded:           {res.get('downloaded', 0)}")
    print(f"Already Existing (Skipped): {res.get('skipped', 0)}")
    print(f"Failed Downloads:           {res.get('failed', 0)}")
    print(f"Manifest Generated at:      {res.get('manifest_path', 'N/A')}")
    print("=" * 70)

    # Trigger audit refresh
    print("\nRefreshing scientific data audit...")
    from scripts.data_audit import run_data_audit
    run_data_audit()

    return 0


if __name__ == "__main__":
    sys.exit(main())
