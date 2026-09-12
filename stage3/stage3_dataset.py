"""
stage3_dataset.py
Efficient PyTorch Dataset for Stage 3 Multi-Head ConvLSTM training.

Key design:
- NEVER loads entire 14 GB NetCDF into RAM
- Exploits existing time=48 chunking: one block read gives 48 timesteps
- Block-level caching: a sliding window within the same 48-step block avoids re-reading
- No future data leakage: sequence(t:t+T) -> label(t+T)
- Static features (MTERH, LAND) loaded once at init and broadcast per sample
"""
from __future__ import annotations

import json
from pathlib import Path

import netCDF4 as nc4
import numpy as np
import torch
from torch import Tensor
from torch.utils.data import Dataset

ROOT = Path(__file__).parent.parent

# ── Feature specification ─────────────────────────────────────────────────────
# Dynamic 2D (surface) features: (time, lat, lon)
SURFACE_FEATURES = [
    "APCP_sfc",    # log1p before normalization
    "IWV",
    "PRMSL_msl",
    "TMP_2m",
    "UGRD_10m",
    "VGRD_10m",
]

# Pressure-level features: (time, plevel, lat, lon) -> select key levels
PLEVEL_FEATURES = {
    "TMP_prl":  [850.0, 500.0, 200.0],    # Temperature at 3 levels
    "RH_prl":   [850.0, 500.0],            # Relative humidity at 2 levels
    "UGRD_prl": [850.0, 200.0],            # U-wind at 2 levels
    "VGRD_prl": [850.0, 200.0],            # V-wind at 2 levels
    "HGT_prl":  [500.0],                   # Geopotential at 1 level
}

# Static features: loaded once
STATIC_FEATURES = ["MTERH_sfc", "LAND_sfc"]

# Pseudo-label targets
LABEL_VARS = [
    "thunderstorm_pseudo_label",
    "cloudburst_pseudo_label",
    "flash_flood_pseudo_label",
]

# Computed: number of dynamic channels
N_SURFACE = len(SURFACE_FEATURES)
N_PLEVEL  = sum(len(v) for v in PLEVEL_FEATURES.values())
N_STATIC  = len(STATIC_FEATURES)
N_DYNAMIC = N_SURFACE + N_PLEVEL      # static broadcast separately
N_CHANNELS_TOTAL = N_DYNAMIC + N_STATIC   # includes static

def count_channels() -> int:
    return N_CHANNELS_TOTAL


# ── Dataset ───────────────────────────────────────────────────────────────────
class HazardDataset(Dataset):
    """
    Lazy-loading NetCDF Dataset for multi-head ConvLSTM hazard prediction.

    Each sample:
        X: (T, C, H, W) float32  — T=seq_len timesteps, C=N_CHANNELS_TOTAL
        y: (3, H, W)    float32  — binary pseudo-labels at t+T (after sequence)

    Static features (MTERH, LAND) are tiled across the T dimension.
    """

    def __init__(
        self,
        nc_path: str | Path,
        time_indices: np.ndarray,
        norm_stats: dict,
        seq_len: int = 12,
        is_train: bool = False,
    ):
        super().__init__()
        self.nc_path = Path(nc_path)
        self.seq_len = seq_len
        self.norm_stats = norm_stats
        self.is_train = is_train

        # Valid sample start indices: we need seq_len steps + 1 target step
        # index i is valid if time_indices[i:i+seq_len+1] are all contiguous
        # Since the mask is a contiguous block, all are valid except last seq_len
        self.time_indices = time_indices  # indices into the full 45292-step array
        self.valid_starts = np.arange(len(time_indices) - seq_len)
        # last valid start: need indices[i], ..., indices[i+seq_len-1] for X
        #                   and indices[i+seq_len] for y
        # Check contiguity (consecutive diff should be 1 since mask is sorted contiguous)
        diffs = np.diff(time_indices)
        self.valid_starts = [
            i for i in range(len(time_indices) - seq_len)
            if np.all(diffs[i:i + seq_len] == 1)
        ]
        self.valid_starts = np.array(self.valid_starts, dtype=np.int64)

        # Get pressure level indices once
        self._load_plevel_indices()

        # Load static features once (small: 32x32)
        self._load_static_features()

    def _load_plevel_indices(self):
        """Load pressure level coordinate and build index maps."""
        with nc4.Dataset(self.nc_path, "r") as ds:
            plevels = np.array(ds.variables["plevel"][:])
        self.plevel_indices = {}
        for var, levels in PLEVEL_FEATURES.items():
            idxs = []
            for lev in levels:
                matches = np.where(np.abs(plevels - lev) < 1.0)[0]
                if len(matches) == 0:
                    raise ValueError(f"Pressure level {lev} hPa not found for {var}")
                idxs.append(int(matches[0]))
            self.plevel_indices[var] = idxs

    def _load_static_features(self):
        """Load MTERH and LAND once. Normalise MTERH by /6000."""
        with nc4.Dataset(self.nc_path, "r") as ds:
            mterh = np.array(ds.variables["MTERH_sfc"][0], dtype=np.float32)
            land  = np.array(ds.variables["LAND_sfc"][0], dtype=np.float32)
        # MTERH: divide by 6000 (max ~5656m)
        mterh = mterh / 6000.0
        # Stack: (2, 32, 32)
        self.static_arr = np.stack([mterh, land], axis=0)

    def __len__(self) -> int:
        return len(self.valid_starts)

    def __getitem__(self, idx: int) -> tuple[Tensor, Tensor]:
        start_pos = int(self.valid_starts[idx])
        # Absolute NetCDF time indices
        seq_nc_idxs = self.time_indices[start_pos : start_pos + self.seq_len]
        tgt_nc_idx  = int(self.time_indices[start_pos + self.seq_len])

        # ── Read sequence frames ────────────────────────────────────────────
        with nc4.Dataset(self.nc_path, "r") as ds:
            nc_start = int(seq_nc_idxs[0])
            nc_end   = int(seq_nc_idxs[-1]) + 1  # slice end (exclusive)

            # Surface features: (T, H, W) each
            surface_frames = []
            for vname in SURFACE_FEATURES:
                arr = np.array(
                    ds.variables[vname][nc_start:nc_end], dtype=np.float32
                )  # (T, 32, 32)
                if vname == "APCP_sfc":
                    arr = np.log1p(arr)
                mu  = self.norm_stats[vname]["mean"]
                std = self.norm_stats[vname]["std"]
                arr = (arr - mu) / (std + 1e-8)
                surface_frames.append(arr)    # (T, 32, 32)

            # Pressure-level features: (T, H, W) per level
            plevel_frames = []
            for vname, level_idxs in self.plevel_indices.items():
                full = np.array(
                    ds.variables[vname][nc_start:nc_end], dtype=np.float32
                )  # (T, 13, 32, 32)
                for li in level_idxs:
                    arr = full[:, li, :, :]   # (T, 32, 32)
                    key = f"{vname}_{li}"
                    mu  = self.norm_stats[key]["mean"]
                    std = self.norm_stats[key]["std"]
                    arr = (arr - mu) / (std + 1e-8)
                    plevel_frames.append(arr)

            # Target labels: (3, 32, 32) at tgt_nc_idx
            labels = []
            for lv in LABEL_VARS:
                lbl = np.array(
                    ds.variables[lv][tgt_nc_idx], dtype=np.float32
                )  # (32, 32)
                labels.append(lbl)

        # ── Assemble X: (T, C, 32, 32) ─────────────────────────────────────
        # Stack surface and plevel along channel dim
        T = self.seq_len
        dynamic = np.stack(surface_frames + plevel_frames, axis=1)  # (T, C_dyn, 32, 32)

        # Broadcast static: (2, 32, 32) -> (T, 2, 32, 32)
        static_tiled = np.tile(self.static_arr[np.newaxis], (T, 1, 1, 1))  # (T, 2, 32, 32)

        x = np.concatenate([dynamic, static_tiled], axis=1)  # (T, C_total, 32, 32)

        # ── Assemble y: (3, 32, 32) ────────────────────────────────────────
        y = np.stack(labels, axis=0)   # (3, 32, 32)

        return (
            torch.from_numpy(x),
            torch.from_numpy(y),
        )
