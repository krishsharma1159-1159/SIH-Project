"""
plot_stage3_metrics.py
Generates high-resolution visualization figures for Stage 3 report:
1. Training & Validation loss curves across all epochs
2. Multi-head hazard AUROC & PR-AUC progression
3. Test set confusion matrices and performance radar
"""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

ROOT = Path(__file__).parent.parent
STAGE3_DIR = ROOT / "stage3"
OUTPUT_DIR = STAGE3_DIR / "outputs"
METRICS_DIR = OUTPUT_DIR / "metrics"
PLOTS_DIR = OUTPUT_DIR / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

# Load history
hist_file = METRICS_DIR / "training_history_full.json" if (METRICS_DIR / "training_history_full.json").exists() else OUTPUT_DIR / "training_history_full.json"
eval_file = METRICS_DIR / "evaluation_results.json" if (METRICS_DIR / "evaluation_results.json").exists() else OUTPUT_DIR / "evaluation_results.json"

if not hist_file.exists():
    print(f"Missing {hist_file}")
    exit(1)

with open(hist_file, "r") as f:
    history = json.load(f)

epochs = [e["epoch"] for e in history]
train_loss = [e["loss"] for e in history]
val_loss = [e["val_loss"] for e in history]

ts_auroc = [e["val_thunderstorm_auroc"] for e in history]
cb_auroc = [e["val_cloudburst_auroc"] for e in history]
ff_auroc = [e["val_flash_flood_auroc"] for e in history]

ts_prauc = [e["val_thunderstorm_prauc"] for e in history]
cb_prauc = [e["val_cloudburst_prauc"] for e in history]
ff_prauc = [e["val_flash_flood_prauc"] for e in history]

fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle("Stage 3 Multi-Head ConvLSTM: Training & Validation Progression (2000-2016 Train / 2017-2018 Val)", fontsize=13, fontweight="bold")

# Plot 1: Loss
axes[0].plot(epochs, train_loss, 'o-', color='#2563eb', label='Train Loss (BCE)', linewidth=2)
axes[0].plot(epochs, val_loss, 's--', color='#dc2626', label='Val Loss (BCE)', linewidth=2)
axes[0].set_title("Loss Convergence", fontsize=11, fontweight="bold")
axes[0].set_xlabel("Epoch", fontsize=10)
axes[0].set_ylabel("Loss", fontsize=10)
axes[0].grid(True, linestyle="--", alpha=0.5)
axes[0].legend()

# Plot 2: AUROC
axes[1].plot(epochs, ts_auroc, '^-', color='#f59e0b', label='Thunderstorm', linewidth=2)
axes[1].plot(epochs, cb_auroc, 'o-', color='#06b6d4', label='Cloudburst', linewidth=2)
axes[1].plot(epochs, ff_auroc, 's-', color='#6366f1', label='Flash Flood', linewidth=2)
axes[1].set_title("Validation AUROC per Hazard", fontsize=11, fontweight="bold")
axes[1].set_xlabel("Epoch", fontsize=10)
axes[1].set_ylabel("AUROC", fontsize=10)
axes[1].set_ylim(0.97, 1.0)
axes[1].grid(True, linestyle="--", alpha=0.5)
axes[1].legend()

# Plot 3: PR-AUC
axes[2].plot(epochs, cb_prauc, 'o-', color='#06b6d4', label='Cloudburst (p=5.2%)', linewidth=2)
axes[2].plot(epochs, ff_prauc, 's-', color='#6366f1', label='Flash Flood (p=0.12%)', linewidth=2)
axes[2].plot(epochs, ts_prauc, '^-', color='#f59e0b', label='Thunderstorm (p=0.035%)', linewidth=2)
axes[2].set_title("Validation PR-AUC per Hazard", fontsize=11, fontweight="bold")
axes[2].set_xlabel("Epoch", fontsize=10)
axes[2].set_ylabel("PR-AUC", fontsize=10)
axes[2].grid(True, linestyle="--", alpha=0.5)
axes[2].legend()

plt.tight_layout()
curve_path = PLOTS_DIR / "training_curves.png"
plt.savefig(curve_path, dpi=200)
plt.close()
print(f"Saved: {curve_path}")

# Plot 4: Test Confusion Matrices
if eval_file.exists():
    with open(eval_file, "r") as f:
        test_eval = json.load(f)

    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    fig.suptitle("Held-Out Test Set (2019-2020) Confusion Matrices (Optimal F1 Threshold)", fontsize=13, fontweight="bold")
    hazards = ["thunderstorm", "cloudburst", "flash_flood"]
    titles = ["Thunderstorm (thr=0.987)", "Cloudburst (thr=0.925)", "Flash Flood (thr=0.992)"]
    cm_colors = ["Blues", "Greens", "Purples"]

    for i, h in enumerate(hazards):
        cm = np.array(test_eval[h]["confusion_matrix"])
        im = axes[i].imshow(cm, cmap=cm_colors[i], interpolation='nearest')
        axes[i].set_title(titles[i], fontsize=11, fontweight="bold")
        axes[i].set_xlabel("Predicted Label", fontsize=10)
        axes[i].set_ylabel("True Label", fontsize=10)
        axes[i].set_xticks([0, 1])
        axes[i].set_yticks([0, 1])
        axes[i].set_xticklabels(["Neg (0)", "Pos (1)"])
        axes[i].set_yticklabels(["Neg (0)", "Pos (1)"])
        # Annotations
        for r in range(2):
            for c in range(2):
                val = cm[r, c]
                axes[i].text(c, r, f"{val:,}", ha="center", va="center",
                             color="white" if val > cm.max()/2 else "black",
                             fontweight="bold")

    plt.tight_layout()
    cm_path = PLOTS_DIR / "test_confusion_matrices.png"
    plt.savefig(cm_path, dpi=200)
    plt.close()
    print(f"Saved: {cm_path}")
