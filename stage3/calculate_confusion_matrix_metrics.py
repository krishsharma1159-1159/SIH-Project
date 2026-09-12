"""
calculate_confusion_matrix_metrics.py
Computes comprehensive confusion matrix metrics, diagnostic rates,
and standard meteorological verification scores (CSI, HSS, ETS, Far, POD)
for all three hazards on the 2019-2020 held-out test dataset.
"""
import json
import math
import numpy as np
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).parent.parent
STAGE3_DIR = Path(__file__).parent
OUTPUT_DIR = STAGE3_DIR / "outputs"
METRICS_DIR = OUTPUT_DIR / "metrics"
METRICS_DIR.mkdir(parents=True, exist_ok=True)
EVAL_FILE = METRICS_DIR / "evaluation_results.json" if (METRICS_DIR / "evaluation_results.json").exists() else OUTPUT_DIR / "evaluation_results.json"

with open(EVAL_FILE, "r") as f:
    eval_data = json.load(f)

def compute_all_metrics(cm, threshold, auroc, prauc):
    tn = int(cm[0][0])
    fp = int(cm[0][1])
    fn = int(cm[1][0])
    tp = int(cm[1][1])
    total = tn + fp + fn + tp
    actual_pos = tp + fn
    actual_neg = tn + fp
    pred_pos = tp + fp
    pred_neg = tn + fn

    # Basic rates
    tpr_recall = tp / actual_pos if actual_pos > 0 else 0.0 # Probability of Detection (POD)
    tnr_spec = tn / actual_neg if actual_neg > 0 else 0.0
    ppv_prec = tp / pred_pos if pred_pos > 0 else 0.0
    npv = tn / pred_neg if pred_neg > 0 else 0.0
    fpr = fp / actual_neg if actual_neg > 0 else 0.0
    fnr = fn / actual_pos if actual_pos > 0 else 0.0 # Miss rate
    fdr = fp / pred_pos if pred_pos > 0 else 0.0 # False Alarm Ratio (FAR in meteorology)

    # Summary scores
    acc = (tp + tn) / total
    bal_acc = (tpr_recall + tnr_spec) / 2.0
    f1 = 2 * (ppv_prec * tpr_recall) / (ppv_prec + tpr_recall + 1e-12) if (ppv_prec + tpr_recall) > 0 else 0.0

    # Meteorological verification scores
    # CSI (Critical Success Index / Threat Score) = TP / (TP + FP + FN)
    csi = tp / (tp + fp + fn) if (tp + fp + fn) > 0 else 0.0
    
    # Random hits expected by chance:
    hits_chance = (actual_pos * pred_pos) / total if total > 0 else 0.0
    
    # ETS (Equitable Threat Score / Gilbert Skill Score)
    ets_denom = (tp + fp + fn - hits_chance)
    ets = (tp - hits_chance) / ets_denom if ets_denom > 0 else 0.0

    # HSS (Heidke Skill Score)
    hss_num = 2 * (tp * tn - fp * fn)
    hss_denom = (tp + fn) * (fn + tn) + (tp + fp) * (fp + tn)
    hss = hss_num / hss_denom if hss_denom > 0 else 0.0

    # Matthews Correlation Coefficient (MCC)
    mcc_denom = math.sqrt(float(actual_pos) * float(actual_neg) * float(pred_pos) * float(pred_neg))
    mcc = float(tp * tn - fp * fn) / mcc_denom if mcc_denom > 0 else 0.0

    # Diagnostic Odds Ratio (DOR)
    dor = (tp * tn) / (fp * fn) if (fp * fn) > 0 else float("inf")

    return {
        "Threshold": round(threshold, 4),
        "Total_Grid_Points": total,
        "Actual_Positives": actual_pos,
        "Actual_Negatives": actual_neg,
        "Predicted_Positives": pred_pos,
        "Predicted_Negatives": pred_neg,
        "True_Positives_TP": tp,
        "True_Negatives_TN": tn,
        "False_Positives_FP": fp,
        "False_Negatives_FN": fn,
        "Sensitivity_Recall_POD": round(tpr_recall, 6),
        "Specificity_TNR": round(tnr_spec, 6),
        "Precision_PPV": round(ppv_prec, 6),
        "Negative_Predictive_Value_NPV": round(npv, 6),
        "False_Positive_Rate_FPR": round(fpr, 6),
        "False_Negative_Rate_MissRate": round(fnr, 6),
        "False_Alarm_Ratio_FAR": round(fdr, 6),
        "Accuracy": round(acc, 6),
        "Balanced_Accuracy": round(bal_acc, 6),
        "F1_Score": round(f1, 6),
        "Critical_Success_Index_CSI": round(csi, 6),
        "Equitable_Threat_Score_ETS": round(ets, 6),
        "Heidke_Skill_Score_HSS": round(hss, 6),
        "Matthews_Correlation_Coefficient_MCC": round(mcc, 6),
        "Diagnostic_Odds_Ratio_DOR": round(dor, 2) if dor != float("inf") else "inf",
        "AUROC": round(auroc, 6),
        "PR_AUC": round(prauc, 6)
    }

results = {}
rows = []

for hazard, data in eval_data.items():
    metrics = compute_all_metrics(
        cm=data["confusion_matrix"],
        threshold=data["best_threshold"],
        auroc=data["auroc"],
        prauc=data["prauc"]
    )
    results[hazard] = metrics
    row = {"Hazard": hazard.replace("_", " ").title(), **metrics}
    rows.append(row)

df = pd.DataFrame(rows)

# 1. Save CSV
csv_path = METRICS_DIR / "confusion_matrix_detailed.csv"
df.to_csv(csv_path, index=False)
print(f"Detailed CSV saved -> {csv_path}")

# 2. Save JSON
json_path = METRICS_DIR / "confusion_matrix_detailed.json"
with open(json_path, "w") as f:
    json.dump(results, f, indent=2)
print(f"Detailed JSON saved -> {json_path}")

# 3. Generate Markdown Report
md_path = METRICS_DIR / "confusion_matrix_report.md"
with open(md_path, "w") as f:
    f.write("# Detailed Confusion Matrix & Meteorological Verification Report\n\n")
    f.write("**Test Dataset**: 2019-01-01 to 2020-12-31 (Held-out Test Split)\n")
    f.write("**Total Spatiotemporal Evaluations**: 2,912 sequences x 32 x 32 = 2,981,888 grid points per hazard\n\n")
    
    cols = ["Hazard", "Threshold", "True_Positives_TP", "False_Positives_FP", "False_Negatives_FN", "True_Negatives_TN", "Precision_PPV", "Sensitivity_Recall_POD", "F1_Score", "Critical_Success_Index_CSI", "Heidke_Skill_Score_HSS", "AUROC", "PR_AUC"]
    sub_df = df[cols]
    header = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join(["---"] * len(cols)) + " |"
    table_lines = [header, sep]
    for _, r in sub_df.iterrows():
        table_lines.append("| " + " | ".join(str(r[c]) for c in cols) + " |")
    f.write("\n".join(table_lines))
    f.write("\n\n---\n\n")
    
    f.write("## 2. Comprehensive Metric Breakdown per Hazard\n\n")
    for hazard, m in results.items():
        h_title = hazard.replace("_", " ").title()
        f.write(f"### {h_title}\n\n")
        f.write(f"* **Optimal Decision Threshold**: `{m['Threshold']}`\n")
        f.write(f"* **Confusion Matrix (2x2)**:\n")
        f.write("```text\n")
        f.write(f"                    Predicted Positive    Predicted Negative\n")
        f.write(f"Actual Positive:    TP = {m['True_Positives_TP']:<12,}   FN = {m['False_Negatives_FN']:<12,}\n")
        f.write(f"Actual Negative:    FP = {m['False_Positives_FP']:<12,}   TN = {m['True_Negatives_TN']:<12,}\n")
        f.write("```\n\n")
        f.write("| Verification Metric | Value | Interpretation |\n")
        f.write("|---|---|---|\n")
        f.write(f"| **AUROC** | `{m['AUROC']}` | Discrimination capability |\n")
        f.write(f"| **PR-AUC** | `{m['PR_AUC']}` | Precision-Recall curve area |\n")
        f.write(f"| **F1 Score** | `{m['F1_Score']}` | Harmonic mean of Precision & Recall |\n")
        f.write(f"| **Precision (PPV)** | `{m['Precision_PPV'] * 100:.2f}%` | True events out of all predicted events |\n")
        f.write(f"| **Recall (POD / Sensitivity)** | `{m['Sensitivity_Recall_POD'] * 100:.2f}%` | Detected events out of all actual events |\n")
        f.write(f"| **Specificity (TNR)** | `{m['Specificity_TNR'] * 100:.3f}%` | Correctly rejected non-events |\n")
        f.write(f"| **False Alarm Ratio (FAR / FDR)** | `{m['False_Alarm_Ratio_FAR'] * 100:.2f}%` | False alarms out of total predicted events |\n")
        f.write(f"| **Miss Rate (FNR)** | `{m['False_Negative_Rate_MissRate'] * 100:.2f}%` | Missed hazard occurrences |\n")
        f.write(f"| **Accuracy** | `{m['Accuracy'] * 100:.2f}%` | Overall correct classifications |\n")
        f.write(f"| **Balanced Accuracy** | `{m['Balanced_Accuracy'] * 100:.2f}%` | Unweighted average of sensitivity & specificity |\n")
        f.write(f"| **Critical Success Index (CSI / Threat Score)** | `{m['Critical_Success_Index_CSI']:.4f}` | Standard meteorological threat score |\n")
        f.write(f"| **Equitable Threat Score (ETS)** | `{m['Equitable_Threat_Score_ETS']:.4f}` | Threat score penalized for chance hits |\n")
        f.write(f"| **Heidke Skill Score (HSS)** | `{m['Heidke_Skill_Score_HSS']:.4f}` | Categorical forecast skill vs random chance |\n")
        f.write(f"| **Matthews Correlation Coeff (MCC)** | `{m['Matthews_Correlation_Coefficient_MCC']:.4f}` | Correlation between actual and predicted |\n")
        f.write(f"| **Diagnostic Odds Ratio (DOR)** | `{m['Diagnostic_Odds_Ratio_DOR']}` | Odds of positive test in positive vs negative |\n\n")

print(f"Markdown report saved -> {md_path}")
