#!/usr/bin/env python3
"""
MEGHNETRA Comprehensive Scientific Data Audit Runner
====================================================
Audits all raw data sources across physical dimensions, variables, units,
spatial coverage (Uttarakhand bounding box: 77.5°-81.2°E, 28.5°-31.5°N),
and temporal coverage.

Outputs audit report to `data/audit/audit_report.json` and `data/audit_report.json`.
Strictly adheres to the Scientific Integrity Rule: Never fabricate or invent data.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add workspace root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.data_audit import run_data_audit
from scripts.generate_manifests import main as generate_manifests_main


def main():
    print("Executing scientific dataset manifests generation...")
    generate_manifests_main()

    print("\nExecuting comprehensive scientific data audit...")
    audit_summary = run_data_audit()

    # Also save explicitly to data/audit/audit_report.json
    audit_dir = Path("data/audit")
    audit_dir.mkdir(parents=True, exist_ok=True)
    target_file = audit_dir / "audit_report.json"

    # Enrich with timestamp and operational status flag
    has_real_data = len(audit_summary.get("connected_sources", [])) > 0
    audit_summary["status"] = "REAL_DATA_DETECTED" if has_real_data else "WAITING_FOR_DATA"
    audit_summary["model_pipeline_locked"] = not has_real_data
    audit_summary["audit_executed_at"] = datetime.utcnow().isoformat() + "Z"

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)

    # Keep root data/audit_report.json synchronized
    with open(Path("data/audit_report.json"), "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)

    print(f"\n[✓] Audit report saved to {target_file} and data/audit_report.json")
    print(f"    Operational Status: {audit_summary['status']}")
    print(f"    Model Pipeline Locked: {audit_summary['model_pipeline_locked']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
