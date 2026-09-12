# MeghNetra

AI-Powered Spatiotemporal Meteorological Hazard Prediction System for Extreme Weather Events (Thunderstorm, Cloudburst, Flash Flood).

## Dataset Setup

The large NetCDF datasets are intentionally stored outside GitHub.

Expected local directory:

```
F:\MODEL_DATA\
```

Required files:

- `clustering_ready.nc`
- `pseudo_labeled_1990_2020.nc`
- `pseudo_labeled_1990_2020_chunked.nc`

Configure:

```bash
MEGHNETRA_DATA_DIR=F:/MODEL_DATA
MEGHNETRA_MODEL_DIR=./model_assets
```

Do not commit these datasets to Git.

## Model Assets

Model checkpoint weights, normalization statistics, and class weights are stored separately in:

```
model_assets/
    best_convlstm.pth
    normalization_stats.json
    class_weights.json
```

## Configuration & Verification

To verify that the external datasets and environment configuration are properly detected:

```bash
python verify_data_config.py
```
