"""
stage3_train.py
Main training script for Multi-Head ConvLSTM hazard prediction.

Modes:
    --smoke     : 3 batches only -- fast sanity check (< 2 min)
    --benchmark : 500 timesteps, 2 epochs -- GPU throughput benchmark
    --full      : Full 2000-2016 training (~4 hour budget)

Prerequisites:
    Run stage3_preprocess.py FIRST to generate:
        stage3/normalization_stats.json
        stage3/class_weights.json
        stage3/split_indices.json

Usage:
    .venv\Scripts\python.exe stage3\stage3_train.py --smoke
    .venv\Scripts\python.exe stage3\stage3_train.py --benchmark
    .venv\Scripts\python.exe stage3\stage3_train.py --full
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.amp import GradScaler, autocast
from torch.utils.data import DataLoader, Subset

# Ensure project root is on path
ROOT = Path(__file__).parent.parent
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).parent))

from backend.config import CHUNKED_DATA_PATH
from stage3_dataset import HazardDataset, count_channels
from convlstm_model import MultiHeadConvLSTM

STAGE3_DIR = Path(__file__).parent
NC_FILE    = CHUNKED_DATA_PATH
CKPT_DIR   = STAGE3_DIR / "outputs"
CKPT_DIR.mkdir(parents=True, exist_ok=True)

LABEL_KEYS = ["thunderstorm", "cloudburst", "flash_flood"]
LABEL_VARS = [
    "thunderstorm_pseudo_label",
    "cloudburst_pseudo_label",
    "flash_flood_pseudo_label",
]


def load_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def load_norm_stats(path: Path) -> dict:
    raw = load_json(path)
    return raw["stats"]


def build_pos_weights(cw: dict, device: torch.device) -> torch.Tensor:
    """Build (3,) pos_weight tensor for BCEWithLogitsLoss."""
    pws = []
    for lv in LABEL_VARS:
        pws.append(float(cw["weights"][lv]["pos_weight"]))
    return torch.tensor(pws, dtype=torch.float32, device=device)


def make_dataset(time_indices: np.ndarray, norm_stats: dict, is_train: bool) -> HazardDataset:
    return HazardDataset(
        nc_path=NC_FILE,
        time_indices=time_indices,
        norm_stats=norm_stats,
        seq_len=12,
        is_train=is_train,
    )


def make_loader(dataset: HazardDataset, batch_size: int, shuffle: bool) -> DataLoader:
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=0,         # Windows + HDF5 multiprocessing unreliable
        pin_memory=True,       # speeds up CPU->GPU transfer
        drop_last=True,
    )


def compute_metrics_batch(
    logits: torch.Tensor, targets: torch.Tensor
) -> dict[str, float]:
    """Per-hazard: AUPRC not feasible per-batch; return BCE loss only."""
    # logits: (B, 3, H, W), targets: (B, 3, H, W)
    return {}   # detailed metrics computed over epoch accumulators below


def log(msg: str, logfile):
    print(msg)
    logfile.write(msg + "\n")
    logfile.flush()


def make_ascii_bar(pct: float, length: int = 20) -> str:
    pct = max(0.0, min(100.0, pct))
    filled = int(round(length * pct / 100.0))
    if filled >= length:
        return "[" + "=" * length + "]"
    return "[" + "=" * filled + ">" + "-" * max(0, length - filled - 1) + "]"


def format_hms(seconds: float) -> str:
    if seconds < 0 or np.isnan(seconds) or np.isinf(seconds):
        return "--:--:--"
    s = int(seconds)
    h = s // 3600
    m = (s % 3600) // 60
    sec = s % 60
    if h > 0:
        return f"{h}h {m:02d}m {sec:02d}s"
    return f"{m:02d}m {sec:02d}s"


def save_status(status_file: Path, data: dict):
    if status_file is None:
        return
    try:
        temp_file = status_file.with_suffix(".tmp")
        with open(temp_file, "w") as f:
            json.dump(data, f, indent=2)
        temp_file.replace(status_file)
    except Exception:
        pass


def train_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.BCEWithLogitsLoss,
    device: torch.device,
    scaler: GradScaler,
    logfile,
    max_batches: int = -1,
    epoch: int = 0,
    total_epochs: int = 1,
    t_train_start: float = 0.0,
    status_file: Path = None,
    batch_size: int = 8,
) -> dict[str, float]:
    model.train()
    total_loss  = 0.0
    batch_count = 0
    t0 = time.time()
    total_batches = len(loader) if max_batches <= 0 else min(len(loader), max_batches)

    for batch_idx, (x, y) in enumerate(loader):
        if max_batches > 0 and batch_idx >= max_batches:
            break

        x = x.to(device, non_blocking=True)    # (B, T, C, H, W)
        y = y.to(device, non_blocking=True)    # (B, 3, H, W)

        optimizer.zero_grad(set_to_none=True)

        with autocast(device_type=device.type, enabled=(device.type == "cuda")):
            out    = model(x)                  # dict
            logits = out["logits"]             # (B, 3, H, W)
            loss   = criterion(logits, y)

        if device.type == "cuda":
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        total_loss  += loss.item()
        batch_count += 1

        # Periodic progress update & status write (every 10 batches or final batch)
        if batch_idx % 10 == 0 or (batch_idx + 1) == total_batches:
            now = time.time()
            elapsed_total = now - (t_train_start if t_train_start > 0 else t0)
            
            epoch_pct = ((batch_idx + 1) / total_batches) * 100.0
            overall_done = epoch * total_batches + (batch_idx + 1)
            overall_total = total_epochs * total_batches
            overall_pct = (overall_done / overall_total) * 100.0
            
            rate = overall_done / max(elapsed_total, 0.001)
            eta_sec = (overall_total - overall_done) / max(rate, 0.0001)
            samples_done = overall_done * batch_size
            speed = samples_done / max(elapsed_total, 0.001)

            bar = make_ascii_bar(overall_pct, 20)
            log(
                f"  {bar} {overall_pct:5.1f}% | Ep {epoch+1}/{total_epochs} "
                f"[{batch_idx+1:4d}/{total_batches}] | Loss: {loss.item():.4f} | "
                f"Avg: {total_loss/batch_count:.4f} | Elapsed: {format_hms(elapsed_total)} | ETA: {format_hms(eta_sec)}",
                logfile
            )

            if status_file is not None:
                save_status(status_file, {
                    "status": "training",
                    "epoch": epoch + 1,
                    "total_epochs": total_epochs,
                    "batch": batch_idx + 1,
                    "total_batches": total_batches,
                    "epoch_progress_pct": round(epoch_pct, 1),
                    "overall_progress_pct": round(overall_pct, 1),
                    "current_loss": round(float(loss.item()), 5),
                    "avg_loss": round(float(total_loss / batch_count), 5),
                    "elapsed_seconds": round(elapsed_total, 1),
                    "elapsed_hms": format_hms(elapsed_total),
                    "eta_seconds": round(eta_sec, 1),
                    "eta_hms": format_hms(eta_sec),
                    "samples_per_sec": round(speed, 1),
                    "bar": bar,
                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
                })

    avg_loss = total_loss / max(batch_count, 1)
    return {"loss": avg_loss, "batches": batch_count}


@torch.no_grad()
def eval_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.BCEWithLogitsLoss,
    device: torch.device,
    logfile,
    max_batches: int = -1,
) -> dict:
    model.eval()
    total_loss  = 0.0
    batch_count = 0

    # Accumulators for AUROC/PR-AUC (collect probabilities + labels)
    all_probs  = [[] for _ in range(3)]
    all_labels = [[] for _ in range(3)]

    for batch_idx, (x, y) in enumerate(loader):
        if max_batches > 0 and batch_idx >= max_batches:
            break

        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)

        with autocast(device_type=device.type, enabled=(device.type == "cuda")):
            out    = model(x)
            logits = out["logits"]
            loss   = criterion(logits, y)

        total_loss  += loss.item()
        batch_count += 1

        probs = torch.sigmoid(logits).cpu().numpy()   # (B, 3, H, W)
        yt    = y.cpu().numpy()                        # (B, 3, H, W)

        for i in range(3):
            all_probs[i].append(probs[:, i].ravel())
            all_labels[i].append(yt[:, i].ravel())

    avg_loss = total_loss / max(batch_count, 1)

    # Compute AUROC + PR-AUC per hazard
    from sklearn.metrics import roc_auc_score, average_precision_score
    metrics = {"loss": avg_loss, "batches": batch_count}

    for i, key in enumerate(LABEL_KEYS):
        probs_cat  = np.concatenate(all_probs[i])
        labels_cat = np.concatenate(all_labels[i]).astype(int)
        n_pos = labels_cat.sum()
        if n_pos < 2:
            log(f"    WARNING: {key} has <2 positives in eval set -- skipping AUROC", logfile)
            metrics[f"{key}_auroc"] = float("nan")
            metrics[f"{key}_prauc"] = float("nan")
        else:
            try:
                auroc = float(roc_auc_score(labels_cat, probs_cat))
                prauc = float(average_precision_score(labels_cat, probs_cat))
            except Exception as e:
                auroc, prauc = float("nan"), float("nan")
                log(f"    WARNING: {key} metric error: {e}", logfile)
            metrics[f"{key}_auroc"] = auroc
            metrics[f"{key}_prauc"] = prauc
            log(f"    {key}: AUROC={auroc:.4f}  PR-AUC={prauc:.4f}  n_pos={n_pos}", logfile)

    return metrics


def save_checkpoint(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    metrics: dict,
    path: Path,
):
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "metrics": metrics,
        },
        path,
    )


def main():
    parser = argparse.ArgumentParser(description="Stage 3 ConvLSTM Training")
    parser.add_argument("--smoke",     action="store_true", help="Smoke test: 3 batches only")
    parser.add_argument("--benchmark", action="store_true", help="GPU benchmark: 500 train timesteps, 2 epochs")
    parser.add_argument("--full",      action="store_true", help="Full 2000-2016 training")
    parser.add_argument("--epochs",    type=int, default=50, help="Max epochs (full mode)")
    parser.add_argument("--batch-size",type=int, default=4,  help="Batch size (default 4)")
    parser.add_argument("--lr",        type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--hidden",    type=int, nargs="+", default=[32, 32],
                        help="Hidden channels per ConvLSTM layer (default 32 32)")
    parser.add_argument("--resume",    type=str, default=None, help="Path to checkpoint to resume from")
    args = parser.parse_args()

    if not any([args.smoke, args.benchmark, args.full]):
        print("ERROR: Specify --smoke, --benchmark, or --full")
        sys.exit(1)

    mode = "smoke" if args.smoke else ("benchmark" if args.benchmark else "full")

    # ── Load pre-computed data ────────────────────────────────────────────────
    stats_path  = STAGE3_DIR / "normalization_stats.json"
    weights_path= STAGE3_DIR / "class_weights.json"
    splits_path = STAGE3_DIR / "split_indices.json"

    for p in [stats_path, weights_path, splits_path]:
        if not p.exists():
            print(f"ERROR: Missing required file: {p}")
            print("Run stage3_preprocess.py first.")
            sys.exit(1)

    norm_stats  = load_norm_stats(stats_path)
    cw          = load_json(weights_path)
    splits      = load_json(splits_path)

    train_idxs  = np.array(splits["train"], dtype=np.int64)
    val_idxs    = np.array(splits["val"],   dtype=np.int64)
    test_idxs   = np.array(splits["test"],  dtype=np.int64)

    # ── Device setup ─────────────────────────────────────────────────────────
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        torch.backends.cudnn.benchmark = True

    # ── Datasets ─────────────────────────────────────────────────────────────
    batch_size = args.batch_size
    max_epochs = args.epochs
    max_train_batches = -1   # unlimited unless smoke/benchmark

    if mode == "smoke":
        print("\n=== SMOKE TEST MODE (3 batches only) ===")
        max_train_batches = 3
        max_val_batches   = 2
        max_epochs        = 1
    elif mode == "benchmark":
        print("\n=== BENCHMARK MODE (500 train steps, 2 epochs) ===")
        bench_n  = 500
        train_idxs = train_idxs[:bench_n]
        max_train_batches = -1
        max_val_batches   = 20
        max_epochs = 2
    else:
        print("\n=== FULL TRAINING MODE ===")
        max_val_batches = -1

    train_ds = make_dataset(train_idxs, norm_stats, is_train=True)
    val_ds   = make_dataset(val_idxs,   norm_stats, is_train=False)

    print(f"  Train samples: {len(train_ds):,}")
    print(f"  Val   samples: {len(val_ds):,}")

    train_loader = make_loader(train_ds, batch_size, shuffle=True)
    val_loader   = make_loader(val_ds,   batch_size, shuffle=False)

    # ── Model ─────────────────────────────────────────────────────────────────
    C = count_channels()
    model = MultiHeadConvLSTM(
        in_channels=C,
        hidden_channels=args.hidden,
        kernel_size=3,
        head_mid_channels=32,
        dropout=0.1,
    ).to(device)

    param_info = model.count_parameters()
    print(f"\nModel channels: {C}")
    print(f"Parameters: {param_info}")

    # ── Loss ─────────────────────────────────────────────────────────────────
    pos_weight = build_pos_weights(cw, device)   # (3,)
    # Broadcast: BCEWithLogitsLoss needs (3,) for (B, 3, H, W)
    # pos_weight must be (3, 1, 1) or it broadcasts automatically
    pos_weight = pos_weight.view(1, 3, 1, 1)

    # Cap extreme pos_weight values to avoid numeric instability
    pos_weight = torch.clamp(pos_weight, max=500.0)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight.expand(1, 3, 32, 32))

    # ── Optimizer + Scheduler ─────────────────────────────────────────────────
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=5
    )
    scaler = GradScaler("cuda", enabled=(device.type == "cuda"))

    # ── Resume ────────────────────────────────────────────────────────────────
    start_epoch = 0
    if args.resume:
        ckpt = torch.load(args.resume, map_location=device)
        model.load_state_dict(ckpt["model_state_dict"])
        optimizer.load_state_dict(ckpt["optimizer_state_dict"])
        start_epoch = ckpt["epoch"] + 1
        print(f"Resumed from epoch {start_epoch}")

    # ── Training loop ─────────────────────────────────────────────────────────
    log_path = CKPT_DIR / f"training_log_{mode}.txt"
    status_file = CKPT_DIR / "training_status.json"
    best_val_prauc = -1.0
    history = []

    with open(log_path, "w") as logfile:
        log(f"Mode: {mode}", logfile)
        log(f"Device: {device}", logfile)
        log(f"Batch size: {batch_size}", logfile)
        log(f"Channels: {C}", logfile)
        log(f"Parameters: {param_info}", logfile)
        log(f"pos_weight (raw): {pos_weight.squeeze().tolist()}", logfile)
        log("", logfile)

        t_train_start = time.time()

        for epoch in range(start_epoch, max_epochs):
            log(f"\n--- Epoch {epoch + 1}/{max_epochs} ---", logfile)
            t_epoch = time.time()

            # Train
            train_met = train_epoch(
                model, train_loader, optimizer, criterion,
                device, scaler, logfile,
                max_batches=max_train_batches,
                epoch=epoch,
                total_epochs=max_epochs,
                t_train_start=t_train_start,
                status_file=status_file,
                batch_size=batch_size,
            )

            # Val status update
            save_status(status_file, {
                "status": "validating",
                "epoch": epoch + 1,
                "total_epochs": max_epochs,
                "batch": len(train_loader) if max_train_batches <= 0 else max_train_batches,
                "total_batches": len(train_loader) if max_train_batches <= 0 else max_train_batches,
                "epoch_progress_pct": 100.0,
                "overall_progress_pct": round(((epoch + 1) / max_epochs) * 100.0, 1),
                "current_loss": round(train_met["loss"], 5),
                "avg_loss": round(train_met["loss"], 5),
                "elapsed_seconds": round(time.time() - t_train_start, 1),
                "elapsed_hms": format_hms(time.time() - t_train_start),
                "eta_seconds": round(max(0.0, (time.time() - t_train_start) / max(epoch + 1, 1) * (max_epochs - (epoch + 1))), 1),
                "eta_hms": format_hms(max(0.0, (time.time() - t_train_start) / max(epoch + 1, 1) * (max_epochs - (epoch + 1)))),
                "bar": make_ascii_bar(((epoch + 1) / max_epochs) * 100.0, 20),
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
            })

            # Val
            val_met = eval_epoch(
                model, val_loader, criterion,
                device, logfile,
                max_batches=(max_val_batches if mode != "full" else -1),
            )

            epoch_secs = time.time() - t_epoch
            log(f"  Epoch {epoch+1}: train_loss={train_met['loss']:.5f}  "
                f"val_loss={val_met['loss']:.5f}  {epoch_secs:.1f}s", logfile)

            # Scheduler step on mean PR-AUC across hazards
            prauc_vals = [val_met.get(f"{k}_prauc", float("nan")) for k in LABEL_KEYS]
            valid_prauc = [v for v in prauc_vals if not np.isnan(v)]
            mean_prauc = float(np.mean(valid_prauc)) if valid_prauc else 0.0
            scheduler.step(mean_prauc)

            # Checkpoint: best model
            if mode == "full" and mean_prauc > best_val_prauc:
                best_val_prauc = mean_prauc
                ckpt_path = CKPT_DIR / "best_model.pt"
                save_checkpoint(model, optimizer, epoch, val_met, ckpt_path)
                log(f"  [BEST] Saved -> {ckpt_path}  (PR-AUC={mean_prauc:.4f})", logfile)

            # Always save latest
            save_checkpoint(
                model, optimizer, epoch, val_met,
                CKPT_DIR / "latest_model.pt",
            )

            entry = {"epoch": epoch + 1, **train_met, **{f"val_{k}": v for k, v in val_met.items()}}
            history.append(entry)

            if mode in ("smoke", "benchmark") and epoch >= start_epoch:
                log(f"\n  [{mode.upper()} complete after epoch {epoch+1}]", logfile)

        total_secs = time.time() - t_train_start
        log(f"\n=== Training finished in {total_secs/60:.2f} min ===", logfile)

        save_status(status_file, {
            "status": "completed",
            "total_epochs": max_epochs,
            "overall_progress_pct": 100.0,
            "elapsed_seconds": round(total_secs, 1),
            "elapsed_hms": format_hms(total_secs),
            "best_val_prauc": round(best_val_prauc, 4) if best_val_prauc >= 0 else None,
            "bar": make_ascii_bar(100.0, 20),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        })

        # Benchmark throughput report
        if mode == "benchmark":
            total_batches = sum(e.get("batches", 0) for e in history)
            samples = total_batches * batch_size
            tps = samples / total_secs
            log(f"BENCHMARK: {samples} samples in {total_secs:.1f}s = {tps:.1f} samples/s", logfile)
            print(f"\nBENCHMARK RESULT: {tps:.1f} samples/s")

    # Save history as JSON
    import json
    hist_path = CKPT_DIR / f"training_history_{mode}.json"
    with open(hist_path, "w") as f:
        json.dump(history, f, indent=2)
    print(f"History saved -> {hist_path}")
    print(f"Log saved -> {log_path}")


if __name__ == "__main__":
    main()
