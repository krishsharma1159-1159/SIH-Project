"""
monitor_training.py
Live status and progress bar reader for Stage 3 ConvLSTM training.
"""
import json
import time
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
STAGE3_DIR = Path(__file__).parent
OUTPUT_DIR = STAGE3_DIR / "outputs"
STATUS_FILE = OUTPUT_DIR / "training_status.json" if (OUTPUT_DIR / "training_status.json").exists() else ROOT / "stage3" / "stage3_outputs" / "training_status.json"
LOG_FILE = OUTPUT_DIR / "logs" / "training_log_full.txt" if (OUTPUT_DIR / "logs" / "training_log_full.txt").exists() else OUTPUT_DIR / "training_log_full.txt"

def main():
    if not STATUS_FILE.exists():
        print(f"Status file not found at: {STATUS_FILE}")
        print("Training has not started yet or has not written status.")
        return

    try:
        with open(STATUS_FILE, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Reading status: {e}")
        return

    status = data.get("status", "unknown")
    epoch = data.get("epoch", 0)
    total_epochs = data.get("total_epochs", 0)
    batch = data.get("batch", 0)
    total_batches = data.get("total_batches", 0)
    pct = data.get("overall_progress_pct", 0.0)
    cur_loss = data.get("current_loss", 0.0)
    avg_loss = data.get("avg_loss", 0.0)
    elapsed = data.get("elapsed_hms", "--:--:--")
    eta = data.get("eta_hms", "--:--:--")
    speed = data.get("samples_per_sec", 0.0)
    bar = data.get("bar", "[--------------------]")
    updated = data.get("updated_at", "")

    print("=" * 65)
    print("      SIH STAGE 3 CONVLSTM TRAINING STATUS MONITOR")
    print("=" * 65)
    print(f"  Status       : {status.upper()}")
    print(f"  Progress     : {bar} {pct:5.1f}%")
    print(f"  Epoch        : {epoch} / {total_epochs}")
    print(f"  Batch        : {batch:,} / {total_batches:,}")
    print(f"  Loss (curr)  : {cur_loss:.5f}")
    print(f"  Loss (avg)   : {avg_loss:.5f}")
    print(f"  Throughput   : {speed} samples/sec")
    print(f"  Elapsed Time : {elapsed}")
    print(f"  ETA Remaining: {eta}")
    print(f"  Last Update  : {updated}")
    print("=" * 65)

if __name__ == "__main__":
    main()
