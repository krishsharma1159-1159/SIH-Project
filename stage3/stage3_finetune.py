"""
stage3_finetune.py
Progressive Curriculum Fine-Tuning for Multi-Head ConvLSTM hazard prediction.

Three-strategy combined pipeline:
  Strategy 1: Active-season filtering (March-September only, ~14,500 samples)
  Strategy 2: Phase 1 - Head-Only Alignment with Focal Loss
              (backbone FROZEN, 1 epoch, ~15 min)
  Strategy 3: Phase 2 - End-to-End Refinement with differential LR
              (backbone UNFROZEN, 2 epochs, lr_backbone=2e-5, lr_heads=1e-4, ~30 min)

Input:  stage3/stage3_outputs/best_model.pt
Output: stage3/stage3_outputs/best_model_finetuned.pt

Usage:
    .venv\Scripts\python.exe stage3\stage3_finetune.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.amp import GradScaler, autocast
from torch.utils.data import DataLoader

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).parent))

from stage3_dataset import HazardDataset
from convlstm_model import MultiHeadConvLSTM

STAGE3_DIR  = Path(__file__).parent
NC_FILE     = ROOT / "pseudo_labeled_1990_2020_chunked.nc"
CKPT_DIR    = STAGE3_DIR / "outputs"
MODELS_DIR  = CKPT_DIR / "models"
METRICS_DIR = CKPT_DIR / "metrics"
LOGS_DIR    = CKPT_DIR / "logs"
for d in [CKPT_DIR, MODELS_DIR, METRICS_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

LABEL_VARS = [
    "thunderstorm_pseudo_label",
    "cloudburst_pseudo_label",
    "flash_flood_pseudo_label",
]
LABEL_KEYS = ["thunderstorm", "cloudburst", "flash_flood"]

BATCH_SIZE    = 8
PHASE1_EPOCHS = 1
PHASE2_EPOCHS = 2
LR_HEADS      = 1e-4
LR_BACKBONE   = 2e-5
FOCAL_GAMMA   = 2.0
WEIGHT_DECAY  = 1e-4
GRAD_CLIP     = 1.0
STATUS_FILE   = CKPT_DIR / "training_status.json"
LOG_FILE      = LOGS_DIR / "finetune_log.txt"
BEST_CKPT     = MODELS_DIR / "best_model_finetuned.pt"
LATEST_CKPT   = MODELS_DIR / "latest_model_finetuned.pt"
HISTORY_FILE  = METRICS_DIR / "finetune_history.json"


def load_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def log(msg: str, logfile):
    print(msg)
    logfile.write(msg + "\n")
    logfile.flush()


def make_ascii_bar(pct: float, length: int = 25) -> str:
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


def save_status(data: dict):
    try:
        temp_file = STATUS_FILE.with_suffix(".tmp")
        with open(temp_file, "w") as f:
            json.dump(data, f, indent=2)
        temp_file.replace(STATUS_FILE)
    except Exception:
        pass


class FocalLoss(nn.Module):
    def __init__(self, gamma: float = 2.0, pos_weight: torch.Tensor = None):
        super().__init__()
        self.gamma = gamma
        if pos_weight is not None:
            self.register_buffer("pos_weight", pos_weight.view(1, -1, 1, 1).float())
        else:
            self.pos_weight = None

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        bce = F.binary_cross_entropy_with_logits(
            logits, targets, reduction="none",
            pos_weight=self.pos_weight
        )
        probs = torch.sigmoid(logits)
        p_t = probs * targets + (1 - probs) * (1 - targets)
        focal_weight = (1 - p_t) ** self.gamma
        return (focal_weight * bce).mean()


def active_season_filter(train_indices: np.ndarray) -> np.ndarray:
    import netCDF4 as nc4
    print("  Loading time coordinate from NetCDF for season filtering...")
    with nc4.Dataset(str(NC_FILE), "r") as ds:
        time_var  = ds.variables["time"]
        time_vals = nc4.num2date(time_var[:], time_var.units,
                                 calendar=getattr(time_var, "calendar", "standard"))
    active_months = {3, 4, 5, 6, 7, 8, 9}
    keep = []
    for idx in train_indices:
        if time_vals[int(idx)].month in active_months:
            keep.append(idx)
    kept = np.array(keep, dtype=train_indices.dtype)
    print(f"  Season filter: {len(train_indices):,} -> {len(kept):,} sequences "
          f"({100*len(kept)/len(train_indices):.1f}% kept, months 3-9)")
    return kept


def make_loader(time_indices: np.ndarray, norm_stats: dict, is_train: bool) -> DataLoader:
    ds = HazardDataset(
        nc_path=NC_FILE,
        time_indices=time_indices,
        norm_stats=norm_stats,
        seq_len=12,
        is_train=is_train,
    )
    return DataLoader(
        ds, batch_size=BATCH_SIZE, shuffle=is_train,
        num_workers=0, pin_memory=True, drop_last=True,
    )


def train_epoch(model, loader, optimizer, criterion, device, scaler, logfile,
                epoch, total_epochs, phase_name, t_start):
    model.train()
    total_loss = 0.0
    batch_count = 0
    total_batches = len(loader)

    for batch_idx, (x, y) in enumerate(loader):
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)

        with autocast(device_type=device.type, enabled=(device.type == "cuda")):
            out    = model(x)
            logits = out["logits"]
            loss   = criterion(logits, y)

        if device.type == "cuda":
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(
                [p for p in model.parameters() if p.requires_grad], max_norm=GRAD_CLIP)
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            torch.nn.utils.clip_grad_norm_(
                [p for p in model.parameters() if p.requires_grad], max_norm=GRAD_CLIP)
            optimizer.step()

        total_loss  += loss.item()
        batch_count += 1

        if batch_idx % 10 == 0 or (batch_idx + 1) == total_batches:
            elapsed = time.time() - t_start
            done_batches = (epoch - 1) * total_batches + (batch_idx + 1)
            all_batches  = total_epochs * total_batches
            overall_pct  = done_batches / all_batches * 100.0
            speed = done_batches / max(elapsed, 1.0)
            eta   = (all_batches - done_batches) / max(speed, 1e-9)
            bar   = make_ascii_bar(overall_pct)
            avg_loss = total_loss / batch_count
            print(
                f"\r[{phase_name}] Ep {epoch}/{total_epochs} "
                f"Bt {batch_idx+1}/{total_batches} "
                f"{bar} {overall_pct:.1f}% | "
                f"Loss:{avg_loss:.4f} | "
                f"Elapsed:{format_hms(elapsed)} | "
                f"ETA:{format_hms(eta)}",
                end="", flush=True
            )
            save_status({
                "phase": phase_name, "epoch": epoch, "total_epochs": total_epochs,
                "batch": batch_idx + 1, "total_batches": total_batches,
                "overall_pct": round(overall_pct, 2), "avg_loss": round(avg_loss, 6),
                "elapsed_s": round(elapsed, 1), "eta_s": round(eta, 1),
            })

    print()
    return {"loss": total_loss / max(batch_count, 1)}


@torch.no_grad()
def validate_epoch(model, loader, criterion, device, logfile):
    from sklearn.metrics import average_precision_score
    model.eval()
    total_loss = 0.0
    batch_count = 0
    all_probs   = {k: [] for k in LABEL_KEYS}
    all_targets = {k: [] for k in LABEL_KEYS}

    for x, y in loader:
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)
        with autocast(device_type=device.type, enabled=(device.type == "cuda")):
            out    = model(x)
            logits = out["logits"]
            loss   = criterion(logits, y)
        total_loss  += loss.item()
        batch_count += 1
        probs = torch.sigmoid(logits).cpu().numpy()
        yt    = y.cpu().numpy()
        for ci, key in enumerate(LABEL_KEYS):
            all_probs[key].append(probs[:, ci].ravel())
            all_targets[key].append(yt[:, ci].ravel())

    metrics = {"val_loss": total_loss / max(batch_count, 1)}
    pr_aucs = []
    for key in LABEL_KEYS:
        p = np.concatenate(all_probs[key])
        t = np.concatenate(all_targets[key])
        try:
            ap = float(average_precision_score(t, p))
        except Exception:
            ap = 0.0
        metrics[f"{key}_pr_auc"] = ap
        pr_aucs.append(ap)
    metrics["mean_pr_auc"] = float(np.mean(pr_aucs))
    return metrics


def main():
    t_start = time.time()
    logfile = open(str(LOG_FILE), "w", encoding="utf-8")

    log("=" * 65, logfile)
    log("  STAGE 3 PROGRESSIVE CURRICULUM FINE-TUNING", logfile)
    log("=" * 65, logfile)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log(f"Device: {device}", logfile)
    if device.type == "cuda":
        log(f"GPU: {torch.cuda.get_device_name(0)}", logfile)
        log(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB", logfile)

    norm_file  = STAGE3_DIR / "normalization_stats.json"
    cw_file    = STAGE3_DIR / "class_weights.json"
    split_file = STAGE3_DIR / "split_indices.json"
    for f in [norm_file, cw_file, split_file]:
        if not f.exists():
            print(f"ERROR: Required file not found: {f}")
            sys.exit(1)

    norm_stats    = load_json(norm_file)["stats"]
    class_weights = load_json(cw_file)
    splits        = load_json(split_file)

    train_indices_full = np.array(splits["train"],      dtype=np.int64)
    val_indices        = np.array(splits["val"], dtype=np.int64)
    log(f"\nFull train: {len(train_indices_full):,}  |  Val: {len(val_indices):,}", logfile)

    log("\n[Strategy 1] Active-season filtering (months 3-9)...", logfile)
    train_indices = active_season_filter(train_indices_full)

    raw_pws = [float(class_weights["weights"][lv]["pos_weight"]) for lv in LABEL_VARS]
    pos_weight = torch.tensor(raw_pws, dtype=torch.float32, device=device)
    log(f"\npos_weights: thunderstorm={raw_pws[0]:.1f}, "
        f"cloudburst={raw_pws[1]:.2f}, flash_flood={raw_pws[2]:.1f}", logfile)

    log(f"\nBuilding data loaders (batch={BATCH_SIZE})...", logfile)
    train_loader = make_loader(train_indices, norm_stats, is_train=True)
    val_loader   = make_loader(val_indices,   norm_stats, is_train=False)
    log(f"  Train batches: {len(train_loader)}  |  Val batches: {len(val_loader)}", logfile)

    base_ckpt = MODELS_DIR / "best_model.pt"
    if not base_ckpt.exists():
        base_ckpt = CKPT_DIR / "best_model.pt"
    if not base_ckpt.exists():
        print(f"ERROR: Checkpoint not found: {base_ckpt}")
        sys.exit(1)
    log(f"\nLoading checkpoint: {base_ckpt}", logfile)
    ckpt = torch.load(str(base_ckpt), map_location="cpu", weights_only=False)

    model = MultiHeadConvLSTM(
        in_channels=18, hidden_channels=[32, 32],
        kernel_size=3, head_mid_channels=32, dropout=0.1,
    ).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    params = model.count_parameters()
    log(f"Model loaded. Total: {params['total']:,} params | "
        f"Backbone: {params['backbone']:,} | Each head: {params['thunderstorm_head']:,}", logfile)

    criterion = FocalLoss(gamma=FOCAL_GAMMA, pos_weight=pos_weight).to(device)
    use_amp   = device.type == "cuda"
    scaler    = GradScaler("cuda", enabled=use_amp)
    history   = []
    best_val_metric = -1.0

    # =========================================================================
    # PHASE 1: Head-Only (backbone FROZEN)
    # =========================================================================
    log("\n" + "=" * 65, logfile)
    log(f"  PHASE 1 - HEAD-ONLY (backbone FROZEN, {PHASE1_EPOCHS} epoch)", logfile)
    log(f"  LR_heads={LR_HEADS}  |  Focal gamma={FOCAL_GAMMA}", logfile)
    log("=" * 65, logfile)

    for param in model.backbone.parameters():
        param.requires_grad = False
    trainable_p1 = sum(p.numel() for p in model.parameters() if p.requires_grad)
    log(f"Trainable params: {trainable_p1:,} (heads only)", logfile)

    optimizer_p1 = torch.optim.Adam(
        [p for p in model.parameters() if p.requires_grad],
        lr=LR_HEADS, weight_decay=WEIGHT_DECAY,
    )
    scheduler_p1 = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer_p1, mode="max", factor=0.5, patience=1)

    for epoch in range(1, PHASE1_EPOCHS + 1):
        t_epoch = time.time()
        log(f"\n--- Phase 1 | Epoch {epoch}/{PHASE1_EPOCHS} ---", logfile)
        train_m = train_epoch(model, train_loader, optimizer_p1, criterion,
                              device, scaler, logfile, epoch, PHASE1_EPOCHS,
                              "Ph1-HeadsOnly", t_start)
        val_m = validate_epoch(model, val_loader, criterion, device, logfile)
        scheduler_p1.step(val_m["mean_pr_auc"])
        epoch_t = time.time() - t_epoch

        log(f"  Train Loss: {train_m['loss']:.4f}", logfile)
        log(f"  Val Loss:   {val_m['val_loss']:.4f}  "
            f"MeanPR-AUC: {val_m['mean_pr_auc']:.4f}  "
            f"(Thunder={val_m['thunderstorm_pr_auc']:.4f}  "
            f"Cloud={val_m['cloudburst_pr_auc']:.4f}  "
            f"Flood={val_m['flash_flood_pr_auc']:.4f})", logfile)
        log(f"  Epoch time: {format_hms(epoch_t)}", logfile)

        history.append({"phase": 1, "epoch": epoch, **train_m, **val_m,
                        "epoch_time_s": round(epoch_t, 1)})

        if val_m["mean_pr_auc"] > best_val_metric:
            best_val_metric = val_m["mean_pr_auc"]
            torch.save({"epoch": epoch, "phase": 1,
                        "model_state_dict": model.state_dict(),
                        "val_metrics": val_m}, str(BEST_CKPT))
            log(f"  *** Best checkpoint saved (PR-AUC={best_val_metric:.4f}) ***", logfile)

        torch.save({"epoch": epoch, "phase": 1,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer_p1.state_dict(),
                    "val_metrics": val_m}, str(LATEST_CKPT))

    # =========================================================================
    # PHASE 2: End-to-End (backbone UNFROZEN, differential LR)
    # =========================================================================
    log("\n" + "=" * 65, logfile)
    log(f"  PHASE 2 - END-TO-END (backbone UNFROZEN, {PHASE2_EPOCHS} epochs)", logfile)
    log(f"  LR_backbone={LR_BACKBONE}  |  LR_heads={LR_HEADS}", logfile)
    log("=" * 65, logfile)

    for param in model.backbone.parameters():
        param.requires_grad = True
    trainable_p2 = sum(p.numel() for p in model.parameters() if p.requires_grad)
    log(f"Trainable params: {trainable_p2:,} (all)", logfile)

    optimizer_p2 = torch.optim.Adam(
        [
            {"params": model.backbone.parameters(),           "lr": LR_BACKBONE},
            {"params": model.thunderstorm_head.parameters(),  "lr": LR_HEADS},
            {"params": model.cloudburst_head.parameters(),    "lr": LR_HEADS},
            {"params": model.flash_flood_head.parameters(),   "lr": LR_HEADS},
        ],
        weight_decay=WEIGHT_DECAY,
    )
    scheduler_p2 = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer_p2, T_max=PHASE2_EPOCHS, eta_min=5e-6)

    for epoch in range(1, PHASE2_EPOCHS + 1):
        t_epoch = time.time()
        log(f"\n--- Phase 2 | Epoch {epoch}/{PHASE2_EPOCHS} ---", logfile)
        train_m = train_epoch(model, train_loader, optimizer_p2, criterion,
                              device, scaler, logfile, epoch, PHASE2_EPOCHS,
                              "Ph2-EndToEnd", t_start)
        val_m = validate_epoch(model, val_loader, criterion, device, logfile)
        scheduler_p2.step()
        epoch_t = time.time() - t_epoch

        log(f"  Train Loss: {train_m['loss']:.4f}", logfile)
        log(f"  Val Loss:   {val_m['val_loss']:.4f}  "
            f"MeanPR-AUC: {val_m['mean_pr_auc']:.4f}  "
            f"(Thunder={val_m['thunderstorm_pr_auc']:.4f}  "
            f"Cloud={val_m['cloudburst_pr_auc']:.4f}  "
            f"Flood={val_m['flash_flood_pr_auc']:.4f})", logfile)
        log(f"  Epoch time: {format_hms(epoch_t)}", logfile)

        history.append({"phase": 2, "epoch": epoch, **train_m, **val_m,
                        "epoch_time_s": round(epoch_t, 1)})

        if val_m["mean_pr_auc"] > best_val_metric:
            best_val_metric = val_m["mean_pr_auc"]
            torch.save({"epoch": epoch, "phase": 2,
                        "model_state_dict": model.state_dict(),
                        "val_metrics": val_m}, str(BEST_CKPT))
            log(f"  *** Best checkpoint saved (PR-AUC={best_val_metric:.4f}) ***", logfile)

        torch.save({"epoch": epoch, "phase": 2,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer_p2.state_dict(),
                    "val_metrics": val_m}, str(LATEST_CKPT))

    # =========================================================================
    # Final summary
    # =========================================================================
    total_time = time.time() - t_start
    log("\n" + "=" * 65, logfile)
    log("  FINE-TUNING COMPLETE", logfile)
    log(f"  Total time:      {format_hms(total_time)}", logfile)
    log(f"  Best PR-AUC:     {best_val_metric:.4f}", logfile)
    log(f"  Best checkpoint: {BEST_CKPT}", logfile)
    log("=" * 65, logfile)

    log("\nEpoch Summary:", logfile)
    hdr = f"  {'Ph':>3} {'Ep':>3} {'TrnLoss':>9} {'ValLoss':>9} {'MeanAUC':>9} {'Thdr':>7} {'Cldb':>7} {'Flood':>7} {'Time':>9}"
    log(hdr, logfile)
    log("  " + "-" * 70, logfile)
    for r in history:
        log(
            f"  {r['phase']:>3} {r['epoch']:>3} "
            f"{r['loss']:>9.4f} {r['val_loss']:>9.4f} "
            f"{r['mean_pr_auc']:>9.4f} "
            f"{r['thunderstorm_pr_auc']:>7.4f} "
            f"{r['cloudburst_pr_auc']:>7.4f} "
            f"{r['flash_flood_pr_auc']:>7.4f} "
            f"{format_hms(r['epoch_time_s']):>9}",
            logfile
        )

    with open(str(HISTORY_FILE), "w") as f:
        json.dump(history, f, indent=2)

    save_status({
        "phase": "COMPLETE",
        "epoch": PHASE1_EPOCHS + PHASE2_EPOCHS,
        "total_epochs": PHASE1_EPOCHS + PHASE2_EPOCHS,
        "overall_pct": 100.0,
        "best_pr_auc": round(best_val_metric, 4),
        "total_time_s": round(total_time, 1),
    })

    logfile.close()
    print(f"\nFine-tuning complete in {format_hms(total_time)}")
    print(f"Best model saved to: {BEST_CKPT}")
    print(f"\nNext: evaluate the fine-tuned model with:")
    print(f"  .venv\\Scripts\\python.exe stage3\\stage3_evaluate.py "
          f"--checkpoint stage3\\stage3_outputs\\best_model_finetuned.pt "
          f"--batch-size 16")


if __name__ == "__main__":
    main()
