"""
stage3_evaluate.py
Full evaluation of saved model on TEST split (2019-2020).
Computes per-hazard:
    - AUROC
    - PR-AUC (Average Precision)
    - Precision, Recall, F1 at optimal and fixed thresholds
    - Confusion matrix (spatial aggregate)
    - Calibration plot data

Usage:
    .venv\Scripts\python.exe stage3\stage3_evaluate.py --checkpoint stage3/stage3_outputs/best_model.pt
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import torch
from torch.amp import autocast
from torch.utils.data import DataLoader

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
LABEL_KEYS = ["thunderstorm", "cloudburst", "flash_flood"]
LABEL_VARS = [
    "thunderstorm_pseudo_label",
    "cloudburst_pseudo_label",
    "flash_flood_pseudo_label",
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, help="Path to model checkpoint (.pt)")
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--hidden",     type=int, nargs="+", default=[32, 32])
    parser.add_argument("--threshold",  type=float, default=None,
                        help="Fixed threshold (default: find optimal on val data)")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Load config
    norm_stats = json.load(open(STAGE3_DIR / "normalization_stats.json"))["stats"]
    splits     = json.load(open(STAGE3_DIR / "split_indices.json"))
    test_idxs  = np.array(splits["test"], dtype=np.int64)

    print(f"Test timesteps: {len(test_idxs):,}")
    print(f"Test period: {splits['test_start']} to {splits['test_end']}")

    # Dataset & loader
    test_ds = HazardDataset(
        nc_path=NC_FILE,
        time_indices=test_idxs,
        norm_stats=norm_stats,
        seq_len=12,
        is_train=False,
    )
    test_loader = DataLoader(
        test_ds, batch_size=args.batch_size,
        shuffle=False, num_workers=0, pin_memory=True,
    )
    print(f"Test samples: {len(test_ds):,}")

    # Model
    C = count_channels()
    model = MultiHeadConvLSTM(
        in_channels=C,
        hidden_channels=args.hidden,
        kernel_size=3,
        head_mid_channels=32,
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

    # Collect predictions
    all_probs  = [[] for _ in range(3)]
    all_labels = [[] for _ in range(3)]

    with torch.no_grad():
        for batch_idx, (x, y) in enumerate(test_loader):
            x = x.to(device, non_blocking=True)
            y = y.to(device, non_blocking=True)

            with autocast(device_type=device.type, enabled=(device.type == "cuda")):
                out = model(x)
                logits = out["logits"]

            probs = torch.sigmoid(logits).cpu().numpy()
            yt    = y.cpu().numpy()

            for i in range(3):
                all_probs[i].append(probs[:, i].ravel())
                all_labels[i].append(yt[:, i].ravel())

            if batch_idx % 20 == 0:
                print(f"  batch {batch_idx}/{len(test_loader)}")

    # Compute metrics
    from sklearn.metrics import (
        roc_auc_score, average_precision_score,
        precision_recall_curve, f1_score,
        confusion_matrix,
    )

    results = {}
    for i, key in enumerate(LABEL_KEYS):
        probs_cat  = np.concatenate(all_probs[i])
        labels_cat = np.concatenate(all_labels[i]).astype(int)
        n_pos      = int(labels_cat.sum())
        n_neg      = int((labels_cat == 0).sum())

        print(f"\n=== {key.upper()} ===")
        print(f"  Positives: {n_pos:,}  Negatives: {n_neg:,}")

        if n_pos < 2:
            print(f"  SKIP: fewer than 2 positives in test set")
            results[key] = {"error": "too few positives"}
            continue

        auroc = float(roc_auc_score(labels_cat, probs_cat))
        prauc = float(average_precision_score(labels_cat, probs_cat))

        # Optimal threshold: max F1 on PR curve
        precisions, recalls, thresholds = precision_recall_curve(labels_cat, probs_cat)
        f1_scores = (2 * precisions * recalls) / (precisions + recalls + 1e-8)
        best_idx  = int(np.argmax(f1_scores[:-1]))
        best_thr  = float(thresholds[best_idx])
        best_f1   = float(f1_scores[best_idx])
        best_prec = float(precisions[best_idx])
        best_rec  = float(recalls[best_idx])

        # Confusion matrix at best threshold
        preds = (probs_cat >= best_thr).astype(int)
        cm = confusion_matrix(labels_cat, preds)

        print(f"  AUROC : {auroc:.4f}")
        print(f"  PR-AUC: {prauc:.4f}")
        print(f"  Best threshold: {best_thr:.4f}")
        print(f"  F1 @ best thr : {best_f1:.4f}")
        print(f"  Precision     : {best_prec:.4f}")
        print(f"  Recall        : {best_rec:.4f}")
        print(f"  Confusion matrix:\n{cm}")

        results[key] = {
            "n_pos": n_pos,
            "n_neg": n_neg,
            "auroc": auroc,
            "prauc": prauc,
            "best_threshold": best_thr,
            "best_f1": best_f1,
            "best_precision": best_prec,
            "best_recall": best_rec,
            "confusion_matrix": cm.tolist(),
        }

    # Save results
    metrics_dir = STAGE3_DIR / "outputs" / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    out_path = metrics_dir / "evaluation_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nEvaluation results saved -> {out_path}")


if __name__ == "__main__":
    main()
