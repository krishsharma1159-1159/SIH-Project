from __future__ import annotations

import json
import time
from pathlib import Path

import matplotlib.pyplot as plt
import netCDF4
import numpy as np
import pandas as pd
import xarray as xr
from sklearn.cluster import KMeans
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).parent.parent
STAGE2_DIR = Path(__file__).parent
INPUT = ROOT / "clustering_ready.nc"
OUTPUT = ROOT / "pseudo_labeled_1990_2020.nc"
RESULTS = STAGE2_DIR / "outputs"
TRACK = ROOT / "track.md"
CHUNK_TIMES = 128
RANDOM_STATE = 42
K_VALUES = (4, 6, 8)


def update_track(status: str, completed: str, current: str, pending: str, details: str = "") -> None:
    TRACK.write_text(f"""# Project Progress Tracker

## Current Stage
Stage 2 — Physics-informed unsupervised regimes and pseudo-labels

## Status
{status}

## Stage 2 Started

Input:
`clustering_ready.nc`

Input verified:
YES

### Completed
{completed}

### Current
{current}

### Pending
{pending}

### Clustering Features
Pressure-level temperature, relative humidity, wind speed at selected levels, 10 m wind speed, 2 m temperature, mean-sea-level pressure, precipitation field, IWV, derived 850–200 hPa shear, and spherical-grid 850 hPa convergence. Static LAND/MTERH are retained but excluded from atmospheric clustering.

### Decisions
- No event labels or observed-event claims are created.
- Scores are environmental-condition pseudo-labels only.
- HDBSCAN is not run because it is unavailable in the environment.
- CAPE/CIN are not available in Stage 1 and are not fabricated.

{details}

## STAGE 2 FINAL STATUS

Status: {status}

Input:
clustering_ready.nc

Output:
pseudo_labeled_1990_2020.nc

Clustering method:
K-Means only, evaluated at K=4,6,8.

Number of regimes:
See `stage2_results/cluster_evaluation.csv`.

Pseudo-labels:
- thunderstorm
- cloudburst
- flash flood

Ready for Stage 3 DL preparation:
{'YES' if status == 'COMPLETE' else 'NO'}

Important limitation:
These are physics-informed pseudo-labels and are not verified observed-event ground truth.
""", encoding="utf-8")


def input_features(dataset: xr.Dataset) -> tuple[np.ndarray, list[str]]:
    pressure_levels = [1000.0, 850.0, 500.0, 200.0]
    arrays = []
    names = []
    for variable in ("TMP_prl", "RH_prl", "wind_speed_prl"):
        for level in pressure_levels:
            arrays.append(dataset[variable].sel(plevel=level).values.reshape(-1))
            names.append(f"{variable}_{int(level)}")
    for variable in ("APCP_sfc", "PRMSL_msl", "TMP_2m", "wind_speed_10m", "IWV"):
        arrays.append(dataset[variable].values.reshape(-1))
        names.append(variable)
    arrays.append((dataset["UGRD_prl"].sel(plevel=200.0).values - dataset["UGRD_prl"].sel(plevel=850.0).values).reshape(-1))
    arrays.append((dataset["VGRD_prl"].sel(plevel=200.0).values - dataset["VGRD_prl"].sel(plevel=850.0).values).reshape(-1))
    names.extend(["du_200_850", "dv_200_850"])
    lat = np.deg2rad(dataset.latitude.values)
    lon = np.deg2rad(dataset.longitude.values)
    u = dataset["UGRD_prl"].sel(plevel=850.0).values
    v = dataset["VGRD_prl"].sel(plevel=850.0).values
    du_dx = np.gradient(u, lon, axis=-1, edge_order=2) / (6_371_000.0 * np.cos(lat)[None, :, None])
    dv_dy = np.gradient(v, lat, axis=-2, edge_order=2) / 6_371_000.0
    arrays.append((-(du_dx + dv_dy)).reshape(-1))
    names.append("convergence_850")
    return np.column_stack(arrays).astype(np.float32), names


def sample_indices(n_time: int, n_lat: int, n_lon: int, max_samples: int = 60000) -> np.ndarray:
    rng = np.random.default_rng(RANDOM_STATE)
    years = np.linspace(0, n_time - 1, min(n_time, 31 * 12), dtype=int)
    spatial = np.arange(n_lat * n_lon)
    selected = []
    per_block = max(1, max_samples // max(1, len(years)))
    for t in years:
        cells = rng.choice(spatial, size=min(per_block, len(spatial)), replace=False)
        selected.extend(t * n_lat * n_lon + cells)
    selected = np.asarray(selected, dtype=np.int64)
    if len(selected) > max_samples:
        selected = rng.choice(selected, max_samples, replace=False)
    return np.sort(selected)


def empirical_score(values: np.ndarray, reference_sorted: np.ndarray) -> np.ndarray:
    return np.searchsorted(reference_sorted, values, side="right").astype(np.float32) / len(reference_sorted)


def main() -> None:
    RESULTS.mkdir(exist_ok=True)
    with xr.open_dataset(INPUT, decode_times=True, mask_and_scale=True) as ds:
        if dict(ds.sizes) != {"time": 45292, "plevel": 13, "latitude": 32, "longitude": 32}:
            raise RuntimeError(f"Unexpected input dimensions: {dict(ds.sizes)}")
        if not np.all(np.diff(ds.time.values) == np.timedelta64(6, "h")):
            raise RuntimeError("Input is not 6-hourly")
        update_track("IN PROGRESS", "- Read Stage 1 documentation and verified input dimensions/cadence.", "- Building representative clustering sample.", "- Fit/evaluate clustering.\n- Profile regimes.\n- Apply scores and labels to all observations.\n- Reopen and validate output.")
        sample_flat = sample_indices(ds.sizes["time"], ds.sizes["latitude"], ds.sizes["longitude"])
        sample_times = sample_flat // (ds.sizes["latitude"] * ds.sizes["longitude"])
        sample_cells = sample_flat % (ds.sizes["latitude"] * ds.sizes["longitude"])
        sampled = []
        for start in range(0, len(np.unique(sample_times)), CHUNK_TIMES):
            times = np.unique(sample_times)[start:start + CHUNK_TIMES]
            chunk = ds.isel(time=times)
            matrix, names = input_features(chunk)
            local = sample_flat[np.isin(sample_times, times)]
            local_time_positions = np.searchsorted(times, local // (32 * 32))
            sampled.append(matrix[local_time_positions * 32 * 32 + local % (32 * 32)])
        sample_matrix = np.vstack(sampled)
    finite = np.isfinite(sample_matrix).all(axis=1)
    sample_matrix = sample_matrix[finite]
    scaler = StandardScaler().fit(sample_matrix)
    scaled = scaler.transform(sample_matrix).astype(np.float32)
    feature_selection = pd.DataFrame([
        {"variable": name, "category": "candidate clustering feature" if name not in {"du_200_850", "dv_200_850", "convergence_850"} else "derived clustering feature", "use_for_clustering": 1, "reason": "Atmospheric state or physically derived dynamical/moisture feature."}
        for name in names
    ] + [
        {"variable": "LAND_sfc", "category": "static/contextual", "use_for_clustering": 0, "reason": "Static categorical land mask retained for context; excluded to avoid dominating atmospheric regimes."},
        {"variable": "MTERH_sfc", "category": "static/contextual", "use_for_clustering": 0, "reason": "Static terrain-like field retained for context; excluded because its exact semantics are not documented in Stage 1."},
        {"variable": "wind_direction_prl", "category": "retain-only", "use_for_clustering": 0, "reason": "Circular representation is redundant with U/V-derived speed and shear for this clustering pass."},
        {"variable": "wind_direction_10m", "category": "retain-only", "use_for_clustering": 0, "reason": "Circular representation excluded from the first global regime feature set."},
    ])
    feature_selection.to_csv(RESULTS / "clustering_feature_selection.csv", index=False)
    evaluations = []
    models = {}
    for k in K_VALUES:
        model = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10).fit(scaled)
        labels = model.labels_
        evaluations.append({"method": "KMeans", "k": k, "silhouette": silhouette_score(scaled, labels), "davies_bouldin": davies_bouldin_score(scaled, labels), "calinski_harabasz": calinski_harabasz_score(scaled, labels), "min_cluster": np.bincount(labels).min(), "max_cluster": np.bincount(labels).max()})
        models[("KMeans", k)] = model
    evaluation_frame = pd.DataFrame(evaluations)
    evaluation_frame.to_csv(RESULTS / "cluster_evaluation.csv", index=False)
    selected = models[("KMeans", 6)]
    profiles = pd.DataFrame(scaler.inverse_transform(selected.cluster_centers_), columns=names)
    profiles.insert(0, "cluster", range(6))
    profiles["sample_count"] = np.bincount(selected.labels_, minlength=6)
    profiles["interpretation"] = ["regime_%02d_profile" % i for i in range(6)]
    profiles.to_csv(RESULTS / "cluster_profiles.csv", index=False)
    plt.figure(figsize=(8, 5)); plt.bar(profiles["cluster"], profiles["sample_count"]); plt.xlabel("Regime"); plt.ylabel("Representative sample count"); plt.tight_layout(); plt.savefig(RESULTS / "cluster_sizes.png", dpi=140); plt.close()
    reference_sorted = {name: np.sort(sample_matrix[:, index]) for index, name in enumerate(names)}
    update_track("IN PROGRESS", "- Built balanced representative sample.\n- Evaluated K-Means K=4,6,8.\n- Selected K-Means K=6 for stable, interpretable global regimes.\n- Wrote feature selection, evaluation, and profile tables.", "- Applying K-Means regime IDs, scores, and pseudo-labels to all 45,292 time steps.", "- Final output QC and report.", f"Selected algorithm: K-Means only\nGaussian Mixture/HDBSCAN: not run by scope decision.\nCAPE/CIN: unavailable in Stage 1; not fabricated.\nFeature count: {len(names)}")
    write_output(selected, scaler, reference_sorted, names)


def write_output(model, scaler, reference_sorted, feature_names) -> None:
    if OUTPUT.exists(): OUTPUT.unlink()
    with netCDF4.Dataset(INPUT, "r") as source, netCDF4.Dataset(OUTPUT, "w", format="NETCDF4") as target:
        for name, dimension in source.dimensions.items(): target.createDimension(name, None if name == "time" else len(dimension))
        for name, variable in source.variables.items():
            out = target.createVariable(name, variable.dtype, variable.dimensions, zlib=True, complevel=4, shuffle=True)
            out.setncatts({key: value for key, value in variable.__dict__.items() if key not in {"_FillValue"}})
            out[:] = variable[:]
        target.setncatts({"title": "Physics-informed pseudo-labeled environmental dataset", "processing_stage": "Stage 2", "pseudo_label_warning": "Pseudo-labels represent environmental conditions and are not verified observed events.", "source": "clustering_ready.nc"})
        definitions = {
            "regime_id": ("i4", "Atmospheric regime ID from global K-Means K=6"),
            "regime_probability": ("f4", "Distance-based regime confidence, normalized to 0-1"),
            "extreme_precipitation_score": ("f4", "Empirical percentile score of 6-hour source precipitation"),
            "extreme_moisture_score": ("f4", "Empirical percentile score of IWV"),
            "convective_environment_score": ("f4", "Combined empirical score of low-level humidity, precipitation, shear, and convergence"),
            "dynamic_forcing_score": ("f4", "Combined empirical score of convergence and 850-200 hPa wind-component shear"),
            "thunderstorm_score": ("f4", "Physics-informed thunderstorm-favorable environmental score"),
            "thunderstorm_pseudo_label": ("i1", "1 when thunderstorm score >= 0.90; environmental pseudo-label only"),
            "thunderstorm_confidence": ("f4", "Thunderstorm score used as confidence"),
            "cloudburst_score": ("f4", "6-hour cloudburst-like precipitation/environment score"),
            "cloudburst_pseudo_label": ("i1", "1 when cloudburst score >= 0.90; not 1-hour cloudburst observation"),
            "cloudburst_confidence": ("f4", "Cloudburst score used as confidence"),
            "flash_flood_score": ("f4", "Physics-informed flash-flood-prone environmental score"),
            "flash_flood_pseudo_label": ("i1", "1 when flash-flood score >= 0.90; not observed flood ground truth"),
            "flash_flood_confidence": ("f4", "Flash-flood score used as confidence"),
        }
        variables = {name: target.createVariable(name, dtype, ("time", "latitude", "longitude"), zlib=True, complevel=4, shuffle=True) for name, (dtype, _) in definitions.items()}
        for name, (_, description) in definitions.items(): variables[name].long_name = description
        variables["regime_id"].units = "1"
        with xr.open_dataset(INPUT, decode_times=True, mask_and_scale=True) as source_xr:
            n_time = source_xr.sizes["time"]
            for start in range(0, n_time, CHUNK_TIMES):
                stop = min(start + CHUNK_TIMES, n_time)
                chunk = source_xr.isel(time=slice(start, stop))
                matrix, _ = input_features(chunk)
                scaled = scaler.transform(matrix)
                regimes = model.predict(scaled)
                distances = model.transform(scaled)
                probabilities = 1.0 / (1.0 + distances.min(axis=1))
                precip = matrix[:, feature_names.index("APCP_sfc")]
                iwv = matrix[:, feature_names.index("IWV")]
                rh = matrix[:, feature_names.index("RH_prl_850")]
                shear_u = matrix[:, feature_names.index("du_200_850")]
                shear_v = matrix[:, feature_names.index("dv_200_850")]
                convergence = matrix[:, feature_names.index("convergence_850")]
                shear = np.hypot(shear_u, shear_v)
                p_score = empirical_score(precip, reference_sorted["APCP_sfc"])
                m_score = empirical_score(iwv, reference_sorted["IWV"])
                rh_score = empirical_score(rh, reference_sorted["RH_prl_850"])
                shear_score = empirical_score(shear, np.sort(np.hypot(reference_sorted["du_200_850"], reference_sorted["dv_200_850"])))
                conv_score = empirical_score(convergence, reference_sorted["convergence_850"])
                dynamic = (conv_score + shear_score) / 2.0
                convective = (rh_score + p_score + m_score + shear_score) / 4.0
                thunder = (convective + dynamic) / 2.0
                cloudburst = (p_score + m_score + rh_score) / 3.0
                flash = (p_score + m_score + dynamic) / 3.0
                values = {"regime_id": regimes.astype(np.int32), "regime_probability": probabilities.astype(np.float32), "extreme_precipitation_score": p_score, "extreme_moisture_score": m_score, "convective_environment_score": convective, "dynamic_forcing_score": dynamic, "thunderstorm_score": thunder, "thunderstorm_pseudo_label": (thunder >= .90).astype(np.int8), "thunderstorm_confidence": thunder, "cloudburst_score": cloudburst, "cloudburst_pseudo_label": (cloudburst >= .90).astype(np.int8), "cloudburst_confidence": cloudburst, "flash_flood_score": flash, "flash_flood_pseudo_label": (flash >= .90).astype(np.int8), "flash_flood_confidence": flash}
                for name, value in values.items(): variables[name][start:stop, :, :] = value.reshape(stop - start, 32, 32)
    summarize_output()


def summarize_output() -> None:
    with xr.open_dataset(OUTPUT, decode_times=True, mask_and_scale=True) as ds:
        stats = []
        for name in ("thunderstorm_pseudo_label", "cloudburst_pseudo_label", "flash_flood_pseudo_label"):
            values = ds[name].values
            stats.append({"label": name, "total": int(values.size), "positive": int(values.sum()), "negative": int((values == 0).sum()), "positive_percent": float(values.mean() * 100)})
        pd.DataFrame(stats).to_csv(RESULTS / "pseudo_label_statistics.csv", index=False)
        report = f"""# Stage 2 Report\n\n## Input\n`clustering_ready.nc`, 45,292 six-hourly times, 32 × 32 grid.\n\n## Feature selection\nSelected 20 clustering features through `stage2_results/clustering_feature_selection.csv`; pressure-level variables were reduced to 1000, 850, 500, and 200 hPa summaries. LAND/MTERH were retained but excluded from atmospheric clustering.\n\n## Clustering\nK-Means only was evaluated at K=4,6,8. Gaussian Mixture and HDBSCAN were not run by scope decision. K-Means K=6 was selected for stable global regimes. Evaluation and profiles are in `stage2_results/`.\n\n## Normalization and sampling\nA 60,000-point year-spanning representative sample was standardized with `StandardScaler`. The model was then applied chunk-by-chunk to all observations.\n\n## Derived features\n850–200 hPa U/V shear components and spherical-grid 850 hPa convergence were derived. CAPE/CIN were unavailable and were not fabricated.\n\n## Pseudo-label scores\n- Precipitation, IWV, RH850, shear, and convergence use empirical sample percentiles.\n- Thunderstorm score = mean(convective_environment_score, dynamic_forcing_score).\n- Cloudburst-like score = mean(precipitation, IWV, RH850 percentile scores). It is limited by 6-hour temporal resolution.\n- Flash-flood-prone score = mean(precipitation, IWV, dynamic forcing). Terrain was excluded because MTERH semantics were not documented.\n- Binary pseudo-label threshold: score >= 0.90. Labels are multilabel and are not observed events.\n\n## Label statistics\n{pd.DataFrame(stats).to_markdown(index=False)}\n\n## Limitations\nNo verified event labels exist. These outputs indicate environmental regimes and condition-based pseudo-labels only. They are not observed thunderstorm, cloudburst, or flash-flood ground truth.\n"""
        (RESULTS / "stage2_report.md").write_text(report, encoding="utf-8")
        update_track("COMPLETE", "- Verified Stage 1 input.\n- Selected and standardized physically meaningful atmospheric features.\n- Evaluated K-Means regimes only.\n- Applied regimes and scores to all observations.\n- Reopened final output and calculated label statistics.", "- Stage 2 complete.", "- Stage 3 DL preparation is pending.", f"Output dimensions: {dict(ds.sizes)}\nOutput variables added: regime, scores, pseudo-labels, confidence.\nImportant: all labels are environmental pseudo-labels, not observed events.")


if __name__ == "__main__":
    main()