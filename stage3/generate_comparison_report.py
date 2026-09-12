"""
generate_comparison_report.py
Generates comprehensive meteorological verification metrics and confusion matrix
comparison between Baseline (before fine-tuning) and Fine-Tuned (after fine-tuning) models.
"""
import json
import math
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

STAGE3_DIR = Path(__file__).parent
OUTPUT_DIR = STAGE3_DIR / "outputs"
METRICS_DIR = OUTPUT_DIR / "metrics"
PLOTS_DIR = OUTPUT_DIR / "plots"
METRICS_DIR.mkdir(parents=True, exist_ok=True)
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

with open(METRICS_DIR / "evaluation_results_before_finetuning.json", "r") as f:
    before_data = json.load(f)

with open(METRICS_DIR / "evaluation_results_after_finetuning.json", "r") as f:
    after_data = json.load(f)

def compute_metrics(cm, thr, auroc, prauc):
    tn = int(cm[0][0])
    fp = int(cm[0][1])
    fn = int(cm[1][0])
    tp = int(cm[1][1])
    total = tn + fp + fn + tp
    actual_pos = tp + fn
    actual_neg = tn + fp
    pred_pos = tp + fp
    pred_neg = tn + fn

    tpr_recall = tp / actual_pos if actual_pos > 0 else 0.0
    tnr_spec = tn / actual_neg if actual_neg > 0 else 0.0
    ppv_prec = tp / pred_pos if pred_pos > 0 else 0.0
    npv = tn / pred_neg if pred_neg > 0 else 0.0
    fpr = fp / actual_neg if actual_neg > 0 else 0.0
    fnr = fn / actual_pos if actual_pos > 0 else 0.0
    far = fp / pred_pos if pred_pos > 0 else 0.0

    acc = (tp + tn) / total
    bal_acc = (tpr_recall + tnr_spec) / 2.0
    f1 = 2 * (ppv_prec * tpr_recall) / (ppv_prec + tpr_recall + 1e-12) if (ppv_prec + tpr_recall) > 0 else 0.0

    csi = tp / (tp + fp + fn) if (tp + fp + fn) > 0 else 0.0
    a_ref = (actual_pos * pred_pos) / total
    ets = (tp - a_ref) / (tp + fp + fn - a_ref) if (tp + fp + fn - a_ref) > 0 else 0.0
    denom_hss = ((tp + fn) * (fn + tn) + (tp + fp) * (fp + tn))
    num_hss = 2 * (tp * tn - fp * fn)
    hss = num_hss / denom_hss if denom_hss > 0 else 0.0
    denom_mcc = math.sqrt(float(tp + fp) * float(tp + fn) * float(tn + fp) * float(tn + fn))
    mcc = (float(tp * tn) - float(fp * fn)) / denom_mcc if denom_mcc > 0 else 0.0
    dor = (tp * tn) / (fp * fn) if (fp * fn) > 0 else float("inf")

    return {
        "Threshold": round(thr, 4),
        "TP": tp,
        "FP": fp,
        "FN": fn,
        "TN": tn,
        "AUROC": round(auroc, 4),
        "PR_AUC": round(prauc, 4),
        "F1_Score": round(f1, 4),
        "Precision_pct": round(ppv_prec * 100, 2),
        "Recall_pct": round(tpr_recall * 100, 2),
        "FAR_FalseAlarm_pct": round(far * 100, 2),
        "CSI_ThreatScore": round(csi, 4),
        "ETS_EquitableThreat": round(ets, 4),
        "HSS_HeidkeSkill": round(hss, 4),
        "MCC": round(mcc, 4),
        "DOR": round(dor, 2) if dor != float("inf") else "inf"
    }

comparison_rows = []
comparison_dict = {}

hazards = ["thunderstorm", "cloudburst", "flash_flood"]

for h in hazards:
    b = before_data[h]
    a = after_data[h]

    m_before = compute_metrics(b["confusion_matrix"], b["best_threshold"], b["auroc"], b["prauc"])
    m_after  = compute_metrics(a["confusion_matrix"], a["best_threshold"], a["auroc"], a["prauc"])

    h_name = h.replace("_", " ").title()

    comparison_dict[h] = {
        "before_finetuning": m_before,
        "after_finetuning": m_after,
        "delta": {
            "AUROC_diff": round(m_after["AUROC"] - m_before["AUROC"], 4),
            "PR_AUC_diff": round(m_after["PR_AUC"] - m_before["PR_AUC"], 4),
            "PR_AUC_pct_gain": round((m_after["PR_AUC"] - m_before["PR_AUC"]) / m_before["PR_AUC"] * 100, 2),
            "F1_Score_diff": round(m_after["F1_Score"] - m_before["F1_Score"], 4),
            "Precision_diff_pp": round(m_after["Precision_pct"] - m_before["Precision_pct"], 2),
            "Recall_diff_pp": round(m_after["Recall_pct"] - m_before["Recall_pct"], 2),
            "CSI_diff": round(m_after["CSI_ThreatScore"] - m_before["CSI_ThreatScore"], 4)
        }
    }

    row_b = {"Hazard": h_name, "Model": "Before (Baseline)", **m_before}
    row_a = {"Hazard": h_name, "Model": "After (Fine-Tuned)", **m_after}
    comparison_rows.extend([row_b, row_a])

df_comp = pd.DataFrame(comparison_rows)
csv_path = METRICS_DIR / "confusion_matrix_before_vs_after.csv"
df_comp.to_csv(csv_path, index=False)
print(f"Saved: {csv_path}")

json_path = METRICS_DIR / "confusion_matrix_before_vs_after.json"
with open(json_path, "w") as f:
    json.dump(comparison_dict, f, indent=2)
print(f"Saved: {json_path}")

# Generate high-resolution side-by-side plot
fig, axes = plt.subplots(3, 2, figsize=(12, 14))
fig.suptitle("Confusion Matrices: Before vs After Progressive Fine-Tuning\n(Held-out Test Period 2019-2020: 2,981,888 Grid Points per Hazard)", fontsize=13, fontweight="bold")

cm_cmaps = ["Blues", "Greens", "Purples"]

for i, h in enumerate(hazards):
    h_title = h.replace("_", " ").title()
    cm_b = np.array(before_data[h]["confusion_matrix"])
    cm_a = np.array(after_data[h]["confusion_matrix"])
    cmap = cm_cmaps[i]

    # Before plot
    im_b = axes[i, 0].imshow(cm_b, cmap=cmap, interpolation="nearest")
    axes[i, 0].set_title(f"{h_title} — BEFORE (Baseline)\nThreshold: {before_data[h]['best_threshold']:.4f} | F1: {before_data[h]['best_f1']:.4f}", fontsize=10, fontweight="bold")
    axes[i, 0].set_xlabel("Predicted Label", fontsize=9)
    axes[i, 0].set_ylabel("True Label", fontsize=9)
    axes[i, 0].set_xticks([0, 1])
    axes[i, 0].set_yticks([0, 1])
    axes[i, 0].set_xticklabels(["Neg (0)", "Pos (1)"])
    axes[i, 0].set_yticklabels(["Neg (0)", "Pos (1)"])
    for r in range(2):
        for c in range(2):
            val = cm_b[r, c]
            axes[i, 0].text(c, r, f"{val:,}", ha="center", va="center",
                            color="white" if val > cm_b.max()/2 else "black", fontweight="bold")

    # After plot
    im_a = axes[i, 1].imshow(cm_a, cmap=cmap, interpolation="nearest")
    axes[i, 1].set_title(f"{h_title} — AFTER (Fine-Tuned)\nThreshold: {after_data[h]['best_threshold']:.4f} | F1: {after_data[h]['best_f1']:.4f}", fontsize=10, fontweight="bold")
    axes[i, 1].set_xlabel("Predicted Label", fontsize=9)
    axes[i, 1].set_ylabel("True Label", fontsize=9)
    axes[i, 1].set_xticks([0, 1])
    axes[i, 1].set_yticks([0, 1])
    axes[i, 1].set_xticklabels(["Neg (0)", "Pos (1)"])
    axes[i, 1].set_yticklabels(["Neg (0)", "Pos (1)"])
    for r in range(2):
        for c in range(2):
            val = cm_a[r, c]
            axes[i, 1].text(c, r, f"{val:,}", ha="center", va="center",
                            color="white" if val > cm_a.max()/2 else "black", fontweight="bold")

plt.tight_layout()
plot_path = PLOTS_DIR / "confusion_matrix_before_vs_after.png"
plt.savefig(plot_path, dpi=200)
plt.close()
print(f"Saved: {plot_path}")
