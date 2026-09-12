"""
stage3_preprocess.py
Compute and save:
    1. Normalization statistics (mean, std) from TRAIN period only (2000-2016)
    2. Train-only class weights for BCEWithLogitsLoss
    3. Temporal index arrays for TRAIN / VAL / TEST splits

Outputs (all written to stage3/):
    normalization_stats.json
    class_weights.json
    split_indices.json

This script is IDEMPOTENT -- safe to re-run.
Run using: .venv\Scripts\python.exe stage3\stage3_preprocess.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import netCDF4 as nc4
import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
NC_FILE = ROOT / "pseudo_labeled_1990_2020_chunked.nc"
STAGE3_DIR = Path(__file__).parent
STATS_FILE = STAGE3_DIR / "normalization_stats.json"
WEIGHTS_FILE = STAGE3_DIR / "class_weights.json"
SPLITS_FILE = STAGE3_DIR / "split_indices.json"

# ── Feature spec (mirrors stage3_dataset.py) ─────────────────────────────────
SURFACE_FEATURES = [
    "APCP_sfc",    # log1p first
    "IWV",
    "PRMSL_msl",
    "TMP_2m",
    "UGRD_10m",
    "VGRD_10m",
]

PLEVEL_FEATURES = {
    "TMP_prl":  [850.0, 500.0, 200.0],
    "RH_prl":   [850.0, 500.0],
    "UGRD_prl": [850.0, 200.0],
    "VGRD_prl": [850.0, 200.0],
    "HGT_prl":  [500.0],
}

LABEL_VARS = [
    "thunderstorm_pseudo_label",
    "cloudburst_pseudo_label",
    "flash_flood_pseudo_label",
]


def build_time_index(ds: nc4.Dataset) -> pd.DatetimeIndex:
    tv = ds.variables["time"]
    t_raw = np.array(tv[:])
    t_units = getattr(tv, "units", "seconds since 1970-01-01")
    t_cal   = getattr(tv, "calendar", "standard")
    t_dt    = nc4.num2date(t_raw, units=t_units, calendar=t_cal)
    return pd.DatetimeIndex([
        pd.Timestamp(t.year, t.month, t.day, t.hour) for t in t_dt
    ])


def get_plevel_idx(ds: nc4.Dataset) -> dict[str, list[int]]:
    plevels = np.array(ds.variables["plevel"][:])
    out = {}
    for var, levels in PLEVEL_FEATURES.items():
        idxs = []
        for lev in levels:
            matches = np.where(np.abs(plevels - lev) < 1.0)[0]
            idxs.append(int(matches[0]))
        out[var] = idxs
    return out


def compute_normalization_stats(train_mask: np.ndarray, plevel_idx: dict) -> dict:
    """Stream through TRAIN timesteps in 48-step blocks and compute mean+std."""
    train_nc_idxs = np.where(train_mask)[0]
    N = len(train_nc_idxs)
    print(f"  Computing normalization stats over {N} TRAIN timesteps ...")

    # Running Welford accumulators per variable key
    accum: dict[str, dict] = {}

    def get_acc(key: str) -> dict:
        if key not in accum:
            accum[key] = {"n": 0, "mean": 0.0, "M2": 0.0}
        return accum[key]

    def welford_update(acc: dict, vals: np.ndarray):
        vals = vals.ravel().astype(np.float64)
        for v in vals:
            acc["n"] += 1
            delta = v - acc["mean"]
            acc["mean"] += delta / acc["n"]
            acc["M2"] += delta * (v - acc["mean"])

    with nc4.Dataset(NC_FILE, "r") as ds:
        # Process in chunks of 48 (aligns with netCDF4 chunks)
        chunk = 48
        n_chunks = (N + chunk - 1) // chunk
        for ci in range(n_chunks):
            nc_start = int(train_nc_idxs[ci * chunk])
            nc_end   = int(train_nc_idxs[min((ci + 1) * chunk - 1, N - 1)]) + 1
            T_actual = nc_end - nc_start
            if ci % 50 == 0:
                pct = 100.0 * ci / n_chunks
                print(f"    chunk {ci}/{n_chunks} ({pct:.1f}%) ...")
                sys.stdout.flush()

            # Surface features
            for vname in SURFACE_FEATURES:
                arr = np.array(ds.variables[vname][nc_start:nc_end], dtype=np.float32)
                if vname == "APCP_sfc":
                    arr = np.log1p(arr)
                welford_update(get_acc(vname), arr)

            # Plevel features
            for vname, idxs in plevel_idx.items():
                full = np.array(ds.variables[vname][nc_start:nc_end], dtype=np.float32)
                for li in idxs:
                    key = f"{vname}_{li}"
                    welford_update(get_acc(key), full[:, li, :, :])

    # Convert to mean/std
    stats = {}
    for key, acc in accum.items():
        n = acc["n"]
        mean = float(acc["mean"])
        std  = float(np.sqrt(acc["M2"] / (n - 1))) if n > 1 else 1.0
        stats[key] = {
            "mean": mean,
            "std":  std if std > 1e-8 else 1.0,
        }
        print(f"    {key}: mean={mean:.4f}, std={std:.4f}")

    return stats


def compute_class_weights(train_mask: np.ndarray) -> dict:
    """Compute BCEWithLogitsLoss pos_weight from TRAIN positives only."""
    train_nc_idxs = np.where(train_mask)[0]
    N = len(train_nc_idxs)
    print(f"\n  Computing class weights over {N} TRAIN timesteps ...")

    pos_counts = {lv: 0 for lv in LABEL_VARS}
    neg_counts = {lv: 0 for lv in LABEL_VARS}

    with nc4.Dataset(NC_FILE, "r") as ds:
        chunk = 480  # larger chunk for labels (small dtype=int8)
        n_chunks = (N + chunk - 1) // chunk
        for ci in range(n_chunks):
            nc_start = int(train_nc_idxs[ci * chunk])
            nc_end   = int(train_nc_idxs[min((ci + 1) * chunk - 1, N - 1)]) + 1
            if ci % 5 == 0:
                print(f"    label chunk {ci}/{n_chunks} ...")
                sys.stdout.flush()
            for lv in LABEL_VARS:
                arr = np.array(ds.variables[lv][nc_start:nc_end], dtype=np.int32)
                pos_counts[lv] += int(arr.sum())
                neg_counts[lv] += int((arr == 0).sum())

    weights = {}
    for lv in LABEL_VARS:
        pos = pos_counts[lv]
        neg = neg_counts[lv]
        pw  = float(neg / pos) if pos > 0 else 1.0
        weights[lv] = {
            "pos_count": pos,
            "neg_count": neg,
            "total": pos + neg,
            "positive_rate_pct": 100.0 * pos / (pos + neg),
            "pos_weight": pw,
        }
        print(f"    {lv}: pos={pos:,}, neg={neg:,}, pos_weight={pw:.2f}")

    return weights


def main():
    print("=" * 60)
    print("Stage 3 Pre-processing: Normalization Stats + Class Weights")
    print("=" * 60)

    with nc4.Dataset(NC_FILE, "r") as ds:
        t_pd = build_time_index(ds)
        plevel_idx = get_plevel_idx(ds)

    # Split masks
    train_mask = (t_pd.year >= 2000) & (t_pd.year <= 2016)
    val_mask   = (t_pd.year >= 2017) & (t_pd.year <= 2018)
    test_mask  = (t_pd.year >= 2019) & (t_pd.year <= 2020)

    print(f"\nSplit sizes:")
    print(f"  TRAIN: {train_mask.sum():,} timesteps")
    print(f"  VAL  : {val_mask.sum():,} timesteps")
    print(f"  TEST : {test_mask.sum():,} timesteps")

    # Save split indices
    splits = {
        "train": np.where(train_mask)[0].tolist(),
        "val":   np.where(val_mask)[0].tolist(),
        "test":  np.where(test_mask)[0].tolist(),
        "train_start": str(t_pd[train_mask][0]),
        "train_end":   str(t_pd[train_mask][-1]),
        "val_start":   str(t_pd[val_mask][0]),
        "val_end":     str(t_pd[val_mask][-1]),
        "test_start":  str(t_pd[test_mask][0]),
        "test_end":    str(t_pd[test_mask][-1]),
    }
    with open(SPLITS_FILE, "w") as f:
        json.dump(splits, f, indent=2)
    print(f"\nSplit indices saved -> {SPLITS_FILE}")

    # Normalization stats
    print("\n--- NORMALIZATION STATS (TRAIN 2000-2016 only) ---")
    norm_stats = compute_normalization_stats(np.array(train_mask), plevel_idx)
    norm_out = {
        "training_period": "2000-01-01 to 2016-12-31",
        "note": "APCP_sfc has log1p applied before computing stats",
        "stats": norm_stats,
    }
    with open(STATS_FILE, "w") as f:
        json.dump(norm_out, f, indent=2)
    print(f"\nNormalization stats saved -> {STATS_FILE}")

    # Class weights
    print("\n--- CLASS WEIGHTS (TRAIN 2000-2016 only) ---")
    cw = compute_class_weights(np.array(train_mask))
    cw_out = {
        "training_period": "2000-01-01 to 2016-12-31",
        "note": "pos_weight = neg_count / pos_count for BCEWithLogitsLoss",
        "weights": cw,
    }
    with open(WEIGHTS_FILE, "w") as f:
        json.dump(cw_out, f, indent=2)
    print(f"\nClass weights saved -> {WEIGHTS_FILE}")

    print("\n=== Pre-processing complete ===")


if __name__ == "__main__":
    main()
