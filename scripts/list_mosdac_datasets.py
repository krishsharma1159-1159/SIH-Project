#!/usr/bin/env python3
"""
MOSDAC Dataset Catalog & Availability Query CLI
===============================================
Queries the official MOSDAC search API to discover available INSAT-3DR / Sounder
granules and metadata across the Uttarakhand region without downloading files.

Usage:
  python3 scripts/list_mosdac_datasets.py --dataset_id 3RIMG_L1B_STD --limit 10
  python3 scripts/list_mosdac_datasets.py --dataset_id 3RIMG_L2B_HEM --start_date 2024-07-01 --end_date 2024-07-02
"""

import sys
import json
import argparse
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data.mosdac_client import MOSDACClient


def main():
    parser = argparse.ArgumentParser(description="Query MOSDAC ISRO Satellite Catalog")
    parser.add_argument(
        "--dataset_id",
        type=str,
        default="3RIMG_L1B_STD",
        help="MOSDAC Dataset ID (e.g., 3RIMG_L1B_STD, 3RIMG_L2B_HEM, 3RIMG_L2G_RAIN, 3RSND_L2B_PRFL)",
    )
    parser.add_argument(
        "--start_date",
        type=str,
        default=None,
        help="Start date in YYYY-MM-DD format",
    )
    parser.add_argument(
        "--end_date",
        type=str,
        default=None,
        help="End date in YYYY-MM-DD format",
    )
    parser.add_argument(
        "--bbox",
        type=str,
        default="77.5,28.5,81.2,31.5",
        help="Geographical bounding box: minLon,minLat,maxLon,maxLat (default: Uttarakhand)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=25,
        help="Maximum number of records to return (default: 25)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON format",
    )

    args = parser.parse_args()

    client = MOSDACClient()
    print("=" * 65)
    print("MEGHNETRA — MOSDAC DATASET AVAILABILITY CATALOG QUERY")
    print("=" * 65)
    print(f"Target Dataset:   {args.dataset_id}")
    print(f"Temporal Window:  {args.start_date or 'ALL'} to {args.end_date or 'ALL'}")
    print(f"Bounding Box:     {args.bbox}")
    print(f"Fetch Limit:      {args.limit} records")
    print("=" * 65)

    result = client.list_available_products(
        dataset_id=args.dataset_id,
        start_date=args.start_date,
        end_date=args.end_date,
        bounding_box=args.bbox,
        max_records=args.limit,
    )

    if args.json:
        print(json.dumps(result, indent=2))
        return 0 if result.get("success") else 1

    if not result.get("success"):
        print(f"\n[!] Catalog Query Error: {result.get('error')}")
        print(f"    Message: {result.get('message')}")
        if result.get("error") == "NETWORK_UNREACHABLE":
            print("    Hint: Ensure the network has outbound access to https://mosdac.gov.in")
        return 1

    total = result.get("total_results", 0)
    size_mb = result.get("total_size_mb", 0.0)
    entries = result.get("entries", [])

    print(f"\n[✓] Query Succeeded:")
    print(f"    Total Granules Available: {total:,}")
    print(f"    Total Volume:             {size_mb:,.2f} MB")
    print(f"    Retrieved in this page:   {len(entries)}")
    print("-" * 65)

    if entries:
        print(f"{'#':<4} {'Identifier':<42} {'Timestamp / Date':<22} {'Size'}")
        print("-" * 80)
        for i, entry in enumerate(entries, 1):
            ident = entry.get("identifier", "N/A")
            updated = entry.get("updated", "N/A")
            size_b = entry.get("size_bytes", 0)
            size_str = f"{size_b / (1024*1024):.2f} MB" if size_b else "N/A"
            print(f"{i:<4} {ident:<42} {updated:<22} {size_str}")
        print("-" * 80)
        print("\nTo download these granules, run:")
        print(f"  python3 scripts/download_mosdac.py --dataset_id {args.dataset_id} --limit {min(args.limit, 10)}")
    else:
        print("No granule records found matching the search filter criteria.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
