"""
stage3_inference.py
Run inference on an arbitrary time window using a saved ConvLSTM checkpoint.

Usage:
    .venv\Scripts\python.exe stage3\stage3_inference.py \
        --checkpoint stage3/stage3_outputs/best_model.pt \
        --start-time "2020-06-15 00:00" \
        --seq-len 12
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import netCDF4 as nc4
import numpy as np
import pandas as pd
import torch
from torch.amp import autocast

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).parent))

from stage3_dataset import (
    SURFACE_FEATURES, PLEVEL_FEATURES, STATIC_FEATURES,
    HazardDataset,
)
from convlstm_model import MultiHeadConvLSTM

STAGE3_DIR = Path(__file__).parent
NC_FILE    = ROOT / "pseudo_labeled_1990_2020_chunked.nc"


def main():
    parser = argparse.ArgumentParser(description="Stage 3 Inference")
    parser.add_argument("--checkpoint",  required=True)
    parser.add_argument("--start-time",  required=True,
                        help="Start of the 12-step input sequence, e.g. '2020-06-15 00:00'")
    parser.add_argument("--seq-len",     type=int, default=12)
    parser.add_argument("--hidden",      type=int, nargs="+", default=[32, 32])
    parser.add_argument("--threshold",   type=float, default=0.5)
    parser.add_argument("--out-dir",     default="stage3/outputs/prediction_examples")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Load normalization stats
    norm_stats = json.load(open(STAGE3_DIR / "normalization_stats.json"))["stats"]

    # Locate time index for the requested start
    with nc4.Dataset(NC_FILE, "r") as ds:
        tv      = ds.variables["time"]
        t_raw   = np.array(tv[:])
        t_units = getattr(tv, "units", "seconds since 1970-01-01")
        t_cal   = getattr(tv, "calendar", "standard")
        t_dt    = nc4.num2date(t_raw, units=t_units, calendar=t_cal)
        t_pd    = pd.DatetimeIndex([
            pd.Timestamp(t.year, t.month, t.day, t.hour) for t in t_dt
        ])

    target_ts = pd.Timestamp(args.start_time)
    diffs     = np.abs((t_pd - target_ts).total_seconds())
    t_idx     = int(np.argmin(diffs))
    T = args.seq_len

    if t_idx + T >= len(t_pd):
        print(f"ERROR: Not enough timesteps after {target_ts} for seq_len={T}")
        sys.exit(1)

    print(f"Inference sequence: {t_pd[t_idx]} -> {t_pd[t_idx + T - 1]}")
    print(f"Prediction target : {t_pd[t_idx + T]}")

    # Build a mini-dataset with just these T+1 timesteps
    mini_idxs = np.arange(t_idx, t_idx + T + 1, dtype=np.int64)
    mini_ds   = HazardDataset(
        nc_path=NC_FILE,
        time_indices=mini_idxs,
        norm_stats=norm_stats,
        seq_len=T,
        is_train=False,
    )
    x, y = mini_ds[0]
    x = x.unsqueeze(0).to(device)   # (1, T, C, H, W)

    # Load model
    from stage3_dataset import count_channels
    C = count_channels()
    model = MultiHeadConvLSTM(
        in_channels=C, hidden_channels=args.hidden,
        kernel_size=3, head_mid_channels=32,
    ).to(device)
    ckpt_path = Path(args.checkpoint)
    if not ckpt_path.exists():
        for candidate in [STAGE3_DIR / "outputs" / "models" / ckpt_path.name,
                          STAGE3_DIR / "outputs" / ckpt_path.name,
                          STAGE3_DIR / "stage3_outputs" / "models" / ckpt_path.name]:
            if candidate.exists():
                ckpt_path = candidate
                break

    ckpt = torch.load(ckpt_path, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    print(f"Loaded checkpoint {ckpt_path.name} from epoch {ckpt['epoch']}")

    with torch.no_grad():
        with autocast(device_type=device.type, enabled=(device.type == "cuda")):
            out    = model(x)
            logits = out["logits"]            # (1, 3, 32, 32)
            probs  = torch.sigmoid(logits)    # (1, 3, 32, 32)

    probs_np = probs.squeeze(0).cpu().numpy()   # (3, 32, 32)
    preds_np = (probs_np >= args.threshold).astype(np.uint8)

    out_dir = ROOT / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    ts_str  = target_ts.strftime("%Y%m%d_%H%M")

    for i, key in enumerate(["thunderstorm", "cloudburst", "flash_flood"]):
        np.save(out_dir / f"{ts_str}_{key}_prob.npy",  probs_np[i])
        np.save(out_dir / f"{ts_str}_{key}_pred.npy",  preds_np[i])
        n_pos = int(preds_np[i].sum())
        max_p = float(probs_np[i].max())
        print(f"  {key}: max_prob={max_p:.4f}, n_cells_predicted={n_pos}")

    print(f"\nOutputs saved to {out_dir}")


if __name__ == "__main__":
    main()
