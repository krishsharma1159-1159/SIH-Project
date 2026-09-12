# ⛈️ SIH 26077 — AI-Driven Hyper-Local Early Warning System for Severe Weather Nowcasting (MeghNetra)

### Early Warning Prediction for Cloudbursts, Flash Floods, and Severe Thunderstorms over the Indian Subcontinent

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-CUDA-EE4C2C.svg)](https://pytorch.org/)
[![Dataset](https://img.shields.io/badge/Dataset-IMDAA%201990--2020-008080.svg)](https://rds.ncmrwf.gov.in/)
[![Model](https://img.shields.io/badge/Model-Multi--Head%20ConvLSTM-darkgreen.svg)](#-deep-learning-methodology)

---

## 🛠️ MeghNetra Local Dataset Setup

The large NetCDF datasets are intentionally stored outside GitHub.

Expected local directory:

```
F:\MODEL_DATA\
```

Required files:

- `clustering_ready.nc`
- `pseudo_labeled_1990_2020.nc`
- `pseudo_labeled_1990_2020_chunked.nc`

Configure environment variables:

```bash
MEGHNETRA_DATA_DIR=F:/MODEL_DATA
MEGHNETRA_MODEL_DIR=./model_assets
```

To verify that the external datasets and environment configuration are properly detected:

```bash
python verify_data_config.py
```

---


## 📌 Overview

This project develops an **AI-driven hyper-local early warning system** for severe weather events, focusing on:

- ⛈️ Severe thunderstorms
- ☁️ Cloudbursts
- 🌊 Flash floods

The current pipeline uses **IMDAA reanalysis data from 2000-2020 at 6-hourly resolution** as the primary meteorological data source.

The system combines meteorological preprocessing, atmospheric-regime clustering, physics-informed pseudo-label generation, and a **Multi-Head ConvLSTM** model to learn spatial and temporal weather patterns and generate multi-hazard risk predictions.

---

## 🎯 Problem Statement

Severe weather events such as thunderstorms, cloudbursts, and flash floods can develop rapidly and cause major impacts on life, infrastructure, transportation, and local communities.

Conventional forecasts may not provide sufficiently localized information about where severe conditions are likely to develop. A hyper-local warning system needs to understand both:

- **Spatial information** — where the atmospheric pattern is occurring
- **Temporal information** — how that pattern is evolving over time

The objective of SIH 26077 is to develop an AI-based nowcasting system capable of learning evolving atmospheric conditions and producing **localized multi-hazard risk information** for early warning.

---

## 💡 Proposed Solution

The proposed solution follows a three-stage pipeline:

```text
IMDAA Reanalysis Data
        ↓
Stage 1: Preprocessing & Harmonization
        ↓
Stage 2: K-Means Clustering & Physics-Informed Pseudo-Labeling
        ↓
Stage 3: Multi-Head ConvLSTM Learning
        ↓
Thunderstorm | Cloudburst | Flash Flood
        ↓
Probability Heatmaps / Risk Information
        ↓
Early Warning Dashboard / API
```

---

# 🏗️ End-to-End Project Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    DATA INGESTION                            │
│                                                              │
│              IMDAA Reanalysis (1990–2020)                    │
│                     6-Hourly Data                            │
│                                                              │
│ TMP • RH • U/V Wind • APCP • IWV • PRMSL • TMP_2m • Wind    │
│             + Land / Topography Information                  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              STAGE 1: PREPROCESSING                          │
│                                                              │
│ • Spatial grid alignment (32 × 32)                           │
│ • Temporal continuity and chronological sorting              │
│ • Precipitation transformation: log(1 + APCP)               │
│ • Feature preparation                                        │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│        STAGE 2: CLUSTERING & PSEUDO-LABELING                │
│                                                              │
│ • Unsupervised K-Means atmospheric regime clustering         │
│ • Convective stability and moisture threshold mapping        │
│ • Topographic flash-flood runoff coupling                    │
│ • Multi-hazard pseudo-label generation                       │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                 STAGE 3: DEEP LEARNING                       │
│                                                              │
│ • Welford running standardization                            │
│ • 72-hour sequence construction                              │
│ • Multi-Head ConvLSTM                                        │
│ • Mixed Precision / AMP                                      │
│ • Progressive curriculum fine-tuning                         │
│ • Focal Loss                                                  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
                    ┌───────────────────────┐
                    │ Multi-Hazard Outputs  │
                    └───────────┬───────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
           Thunderstorm     Cloudburst     Flash Flood
                 │              │              │
                 └──────────────┼──────────────┘
                                ▼
                    Probability / Risk Heatmaps
                                │
                                ▼
                       Dashboard / API Layer
```

---

# ✨ Key Features

- IMDAA-based atmospheric analysis
- 6-hourly historical weather data
- 32 × 32 spatial prediction domain
- 18 physical input channels
- Unsupervised **K-Means atmospheric-regime clustering**
- Physics-informed pseudo-labeling
- Convective stability and moisture-based hazard mapping
- Topographic coupling for flash-flood risk
- **Multi-Head ConvLSTM** spatiotemporal learning
- 72-hour historical input sequence
- Three hazard-specific prediction heads
- Progressive curriculum fine-tuning
- Focal Loss for rare-event learning
- Train-only normalization to reduce leakage
- Chronological train/validation/test split
- Meteorological verification using CSI, HSS, AUROC and PR-AUC
- Spatiotemporal probability heatmaps
- FastAPI backend for prediction serving

---

# 📊 Data

## Primary Dataset — IMDAA

The project uses **IMDAA (Indian Monsoon Data Assimilation and Analysis) reanalysis data** covering **1990–2020** at **6-hourly temporal resolution**.

The data contains atmospheric and surface variables used to characterize weather conditions over the target spatial domain.

### Major Variables

| Category | Variables / Information |
|---|---|
| Atmospheric levels | TMP, RH, U/V wind at 850, 500 and 200 hPa |
| Surface | APCP, IWV, PRMSL, 2m temperature, 10m wind |
| Static information | Land-surface mask, topography |
| Spatial | 32 × 32 grid |
| Temporal | 6-hourly observations |

---

# 🔄 Methodology

## Stage 1 — Preprocessing & Harmonization

Raw IMDAA NetCDF files are transformed into a consistent machine-learning-ready dataset.

### Operations

1. Ingest historical IMDAA NetCDF files.
2. Select required atmospheric and surface variables.
3. Sort observations chronologically.
4. Align data to the target **32 × 32 grid**.
5. Handle invalid/missing values as required.
6. Apply a nonlinear precipitation transformation:

```text
APCP' = log(1 + APCP)
```

This transformation reduces the dominance of extreme precipitation values while preserving rainfall information.

### Output

```text
clustering_ready.nc
```

---

## Stage 2 — K-Means Clustering & Physics-Informed Pseudo-Labeling

Direct event labels are difficult to obtain from reanalysis data alone. Therefore, the pipeline uses **unsupervised atmospheric-regime clustering followed by physics-informed hazard mapping**.

### K-Means Clustering

K-Means groups observations with similar atmospheric characteristics.

```text
Weather Features
       ↓
    K-Means
       ↓
┌─────────┬─────────┬─────────┐
│ Regime A│ Regime B│ Regime C│
└─────────┴─────────┴─────────┘
```

The clusters represent recurring atmospheric regimes and are not themselves the final hazard labels.

### Physics-Informed Mapping

Cluster/regime information is combined with meteorological thresholds and physical relationships to generate pseudo-labels for:

- Thunderstorms
- Cloudbursts
- Flash floods

### Flash-Flood Coupling

Flash-flood risk incorporates topographic/runoff-related information so that precipitation conditions are considered together with terrain susceptibility.

### Output

```text
pseudo_labeled_1990_2020_chunked.nc
```

---

# 🧠 Deep Learning Methodology

## Multi-Head ConvLSTM

The project uses a **Multi-Head ConvLSTM** architecture for spatiotemporal severe-weather prediction.

### Why ConvLSTM?

Weather forecasting involves both spatial and temporal information.

**CNN:**
> Learns spatial patterns — *where is the pattern?*

**LSTM:**
> Learns temporal patterns — *how does it change with time?*

**ConvLSTM:**
> Learns *where the pattern is and how it evolves over time*.

---

## Input Tensor

```text
(B, 12, 18, 32, 32)
```

Where:

- `B` = batch size
- `12` = time steps
- `18` = physical channels
- `32 × 32` = spatial grid

Since observations are 6-hourly:

```text
12 × 6 hours = 72 hours
```

Thus, the model uses a **72-hour historical sequence**.

---

## Model Architecture

```text
Input
(B, 12, 18, 32, 32)
          │
          ▼
┌──────────────────────┐
│ ConvLSTM Cell 1      │
│ 18 → 32 channels     │
│ 3 × 3 kernel         │
│ LayerNorm             │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Spatial Dropout2D    │
│ p = 0.1              │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ ConvLSTM Cell 2      │
│ 32 → 32 channels     │
│ 3 × 3 kernel         │
│ LayerNorm             │
└──────────┬───────────┘
           ▼
      Shared Latent State
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
 Thunder  Cloud  Flash
 Head     Head   Flood Head
     │     │     │
     └─────┼─────┘
           ▼
     (B, 3, 32, 32)
```

### Output Channels

```text
Channel 0 → Thunderstorm
Channel 1 → Cloudburst
Channel 2 → Flash Flood
```

The shared ConvLSTM backbone learns common spatiotemporal atmospheric representations, while the three task-specific heads learn hazard-specific patterns.

---

# 📅 Dataset & Temporal Split

To reduce temporal data leakage, the 1990–2020 timeline is partitioned chronologically.

| Period | Purpose |
|---|---|
| 1990–1999 | Excluded warm-up period |
| 2000–2016 | Training |
| 2017–2018 | Validation |
| 2019–2020 | Held-out testing |

### Training

- 24,840 6-hourly timesteps
- Normalization statistics calculated only from training data
- Class weights calculated only from training data

### Validation

- 2017–2018
- Used for model selection and tuning

### Test

- 2019–2020
- Never used during training or tuning
- 2,981,888 grid points evaluated per hazard

---

# 🎓 Progressive Curriculum Fine-Tuning

The base ConvLSTM is progressively fine-tuned to improve rare-event prediction.

### Phase 1 — Active-Season Filtering

The training data is filtered to:

```text
March → September
```

This focuses training on the active pre-monsoon and monsoon periods.

### Phase 2 — Hazard Head Alignment

The shared ConvLSTM backbone is frozen while the hazard-specific heads are trained using **Focal Loss (γ = 2.0)**.

```text
Backbone → Frozen
Hazard Heads → Trainable
```

### Phase 3 — End-to-End Refinement

The complete network is unfrozen and trained with differential learning rates:

```text
Backbone LR = 2e-5
Heads LR    = 1e-4
```

A cosine-annealing learning-rate scheduler is used during refinement.

---

# 📈 Model Verification

The final model is evaluated on the held-out **2019–2020** test period.

Metrics include:

- AUROC
- PR-AUC
- F1 Score
- Precision
- Recall
- Critical Success Index (CSI)
- Heidke Skill Score (HSS)
- Equitable Threat Score (ETS)

## Fine-Tuned Model Results

| Hazard | AUROC | PR-AUC | F1 | Precision | Recall | CSI | HSS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Thunderstorm | **0.9950** | **0.1995** | **0.2696** | **24.04%** | 30.69% | **0.1558** | **0.2691** |
| Cloudburst | **0.9817** | **0.7966** | **0.7183** | **67.84%** | **76.31%** | **0.5604** | **0.6981** |
| Flash Flood | **0.9923** | **0.3062** | **0.3556** | 30.18% | **43.27%** | **0.2163** | **0.3540** |

Severe-weather events are highly imbalanced, so event-oriented metrics such as PR-AUC, Recall and CSI are considered alongside AUROC.

---

# 🔌 Backend & API

The trained prediction system is exposed through a **FastAPI backend**.

```text
Dashboard / Client
        │
        ▼
     FastAPI
        │
        ▼
Prediction Service
        │
        ▼
   Model Adapter
        │
        ▼
 Multi-Head ConvLSTM
        │
        ▼
 Risk Predictions
        │
        ▼
   JSON Response
        │
        ▼
Dashboard / Alert Layer
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Check backend health |
| `GET` | `/model/info` | Check model connection/status |
| `POST` | `/predict/nowcast` | Request a nowcast prediction |

### Swagger

FastAPI provides interactive API documentation through Swagger UI:

```text
http://localhost:8000/docs
```

Swagger allows the API to be tested independently of the frontend.

---

# 🛠️ Tech Stack

### Programming

- Python 3.11

### Deep Learning

- PyTorch
- ConvLSTM
- CUDA
- Mixed Precision AMP

### Machine Learning

- Scikit-learn
- K-Means clustering

### Data Processing

- xarray
- NumPy
- pandas
- MetPy
- xESMF
- rioxarray

### Backend

- FastAPI
- Uvicorn
- Pydantic

### Data Formats

- NetCDF
- CSV
- JSON

### Development

- VS Code
- Jupyter
- Git / GitHub

---

# 📁 Project Structure

```text
SIH 2026/
│
├── .venv/
│
├── adm_data/
│   └── Administrative GIS boundaries
│
├── data/
│   └── Raw IMDAA meteorological files
│
├── clustering_ready.nc
├── pseudo_labeled_1990_2020.nc
├── pseudo_labeled_1990_2020_chunked.nc
│
├── requirements.txt
├── README.md
│
├── stage1/
│   ├── stage1_prepare.py
│   ├── stage1_variable_stats.csv
│   └── outputs/
│
├── stage2/
│   ├── stage2_pseudolabel.py
│   └── outputs/
│       ├── cluster_evaluation.csv
│       ├── cluster_profiles.csv
│       ├── cluster_sizes.png
│       ├── clustering_feature_selection.csv
│       └── pseudo_label_statistics.csv
│
└── stage3/
    ├── convlstm_model.py
    ├── stage3_dataset.py
    ├── stage3_preprocess.py
    ├── stage3_train.py
    ├── stage3_finetune.py
    ├── stage3_evaluate.py
    ├── stage3_inference.py
    ├── monitor_training.py
    ├── plot_stage3_metrics.py
    ├── calculate_confusion_matrix_metrics.py
    ├── generate_comparison_report.py
    │
    ├── normalization_stats.json
    ├── class_weights.json
    ├── split_indices.json
    ├── stage3_feature_selection.csv
    │
    └── outputs/
        ├── models/
        │   ├── best_model.pt
        │   └── best_model_finetuned.pt
        ├── metrics/
        ├── plots/
        └── logs/
```

---

# 🚀 Quickstart

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/sih-2026-multi-hazard.git
cd sih-2026-multi-hazard
```

## 2. Create Virtual Environment

### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

## 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

---

## Stage 1 — Preprocessing

```powershell
.venv\Scripts\python.exe stage1\stage1_prepare.py
```

## Stage 2 — Clustering & Pseudo-Labeling

```powershell
.venv\Scripts\python.exe stage2\stage2_pseudolabel.py
```

## Stage 3 — Training

### Compute normalization statistics

```powershell
.venv\Scripts\python.exe stage3\stage3_preprocess.py
```

### Train the base ConvLSTM

```powershell
.venv\Scripts\python.exe stage3\stage3_train.py --full
```

### Fine-tune

```powershell
.venv\Scripts\python.exe stage3\stage3_finetune.py
```

### Evaluate

```powershell
.venv\Scripts\python.exe stage3\stage3_evaluate.py --checkpoint best_model_finetuned.pt --batch-size 16
```

### Generate verification report

```powershell
.venv\Scripts\python.exe stage3\generate_comparison_report.py
```

---

# 🔮 Future Scope

- Real-time INSAT satellite integration
- Higher-resolution DEM/terrain information
- Improved event-based ground-truth labels
- Additional precipitation observations
- Real-time operational data ingestion
- Improved hyper-local spatial resolution
- Advanced multi-task learning
- Explainable AI
- Automated alert delivery
- Production deployment and monitoring

---

# ⚠️ Current Limitations

- The current pipeline is primarily based on IMDAA reanalysis data.
- Pseudo-labels are used where direct event labels are unavailable.
- Flash-flood prediction remains challenging because of extreme class imbalance.
- Operational deployment requires validation against reliable observations and official meteorological warnings.
- Real-time satellite integration is a future extension.

---

# 👥 Contributors

**Smart India Hackathon 2026 — SIH 26077**

### Project
**AI-Driven Hyper-Local Early Warning System for Severe Weather Nowcasting**

Add team members and individual roles here.

---

# 🙏 Acknowledgements

- National Centre for Medium Range Weather Forecasting (NCMRWF)
- IMDAA Project
- Smart India Hackathon 2026
- Open-source scientific Python and deep-learning communities

---

# 📜 Disclaimer

This project is a research/prototype system for severe-weather nowcasting. Model predictions should be validated against reliable observations and official meteorological warnings before being used for operational disaster-management decisions.
>>>>>>> sih-main
