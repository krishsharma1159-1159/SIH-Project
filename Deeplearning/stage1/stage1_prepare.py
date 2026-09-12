from __future__ import annotations

import csv
import os
import tempfile
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.config import CLUSTERING_DATA_PATH

from netCDF4 import Dataset as NetCDFDataset
import numpy as np
import pandas as pd
import xarray as xr


ROOT = Path(__file__).parent.parent
STAGE1_DIR = Path(__file__).parent
DATA_DIR = ROOT / "data"
OUTPUT = CLUSTERING_DATA_PATH
INVENTORY = STAGE1_DIR / "data_inventory.csv"
TRACK = ROOT / "track.md"
REPORT = STAGE1_DIR / "stage1_report.md"
YEARS = range(1990, 2021)


def write_track(section: str, status: str = "IN PROGRESS") -> None:
    TRACK.write_text(
        f"""# Project Progress Tracker\n\n## Current Stage\nStage 1 — Creating clustering-ready NetCDF\n\n## Status\n{status}\n\n{section}\n\n## Stage 1 Final Status\n\nStatus: {status}\n\nOutput:\n- clustering_ready.nc\n- stage1_report.md\n- data_inventory.csv\n\nReady for Stage 2 clustering: {'YES' if status == 'COMPLETE' else 'NO'}\n\nReason:\n{'Stage 1 output was written and independently reopened successfully.' if status == 'COMPLETE' else 'Processing or validation is still in progress.'}\n""",
        encoding="utf-8",
    )


def inventory_sources() -> pd.DataFrame:
    rows = []
    for path in sorted(DATA_DIR.rglob("*.nc")):
        with xr.open_dataset(path, decode_times=True, mask_and_scale=False) as ds:
            time_values = ds["time"].values if "time" in ds.coords else np.array([])
            intervals = np.unique(np.diff(time_values).astype("timedelta64[h]").astype(int)).tolist() if len(time_values) > 1 else []
            for name, variable in ds.data_vars.items():
                rows.append({
                    "file": path.relative_to(ROOT).as_posix(),
                    "extension": path.suffix,
                    "size_bytes": path.stat().st_size,
                    "variable": name,
                    "dimensions": repr(variable.dims),
                    "shape": repr(variable.shape),
                    "dtype": str(variable.dtype),
                    "units": variable.attrs.get("units", ""),
                    "time_start": str(time_values[0]) if len(time_values) else "",
                    "time_end": str(time_values[-1]) if len(time_values) else "",
                    "time_intervals_hours": repr(intervals),
                    "coordinates": ",".join(ds.coords),
                    "fill_value": repr(variable.encoding.get("_FillValue", variable.attrs.get("_FillValue", ""))),
                    "attributes": repr(dict(variable.attrs)),
                })
    frame = pd.DataFrame(rows)
    frame.to_csv(INVENTORY, index=False)
    return frame


def find_file(category: str, variable: str, year: int | None = None) -> Path:
    base = DATA_DIR / category
    pattern = f"*{variable}*{year}.nc" if year is not None else f"*{variable}*.nc"
    matches = sorted(base.rglob(pattern))
    if len(matches) != 1:
        raise RuntimeError(f"Expected one {category} file for {variable} {year}, found {matches}")
    return matches[0]


def validate_grid(dataset: xr.Dataset, reference: xr.Dataset) -> None:
    for coordinate in ("latitude", "longitude"):
        if coordinate not in dataset or not np.array_equal(dataset[coordinate].values, reference[coordinate].values):
            raise RuntimeError(f"Grid mismatch in {coordinate}")
    if not np.all(np.diff(dataset.latitude.values) > 0) or not np.all(np.diff(dataset.longitude.values) > 0):
        raise RuntimeError("Latitude and longitude must be strictly increasing")
    if not np.all(np.diff(dataset.time.values) == np.timedelta64(6, "h")):
        raise RuntimeError("Input time coordinate is not strictly 6-hourly")


def specific_humidity(temperature_k: xr.DataArray, relative_humidity: xr.DataArray, pressure_hpa: xr.DataArray) -> xr.DataArray:
    temperature_c = temperature_k - 273.15
    saturation = 6.112 * np.exp((17.67 * temperature_c) / (temperature_c + 243.5))
    vapor_pressure = (relative_humidity / 100.0) * saturation
    return 0.622 * vapor_pressure / (pressure_hpa - 0.378 * vapor_pressure)


def add_derived(dataset: xr.Dataset) -> xr.Dataset:
    u_pressure = dataset["UGRD_prl"]
    v_pressure = dataset["VGRD_prl"]
    dataset["wind_speed_prl"] = np.hypot(u_pressure, v_pressure).astype(np.float32)
    dataset["wind_speed_prl"].attrs = {"long_name": "Pressure-level wind speed", "units": "m/s", "derived_from": "UGRD_prl,VGRD_prl", "derivation_formula": "sqrt(UGRD_prl^2 + VGRD_prl^2)"}
    dataset["wind_direction_prl"] = ((np.degrees(np.arctan2(-u_pressure, -v_pressure)) + 360.0) % 360.0).astype(np.float32)
    dataset["wind_direction_prl"].attrs = {"long_name": "Pressure-level meteorological wind direction", "units": "degrees", "derived_from": "UGRD_prl,VGRD_prl", "derivation_formula": "atan2(-u,-v), clockwise from north"}
    u_surface = dataset["UGRD_10m"]
    v_surface = dataset["VGRD_10m"]
    dataset["wind_speed_10m"] = np.hypot(u_surface, v_surface).astype(np.float32)
    dataset["wind_speed_10m"].attrs = {"long_name": "10 m wind speed", "units": "m/s", "derived_from": "UGRD_10m,VGRD_10m", "derivation_formula": "sqrt(UGRD_10m^2 + VGRD_10m^2)"}
    dataset["wind_direction_10m"] = ((np.degrees(np.arctan2(-u_surface, -v_surface)) + 360.0) % 360.0).astype(np.float32)
    dataset["wind_direction_10m"].attrs = {"long_name": "10 m meteorological wind direction", "units": "degrees", "derived_from": "UGRD_10m,VGRD_10m", "derivation_formula": "atan2(-u,-v), clockwise from north"}
    pressure = xr.DataArray(dataset.plevel.values, dims=("plevel",), coords={"plevel": dataset.plevel}, attrs={"units": "hPa"})
    dataset["specific_humidity"] = specific_humidity(dataset["TMP_prl"], dataset["RH_prl"], pressure).astype(np.float32)
    dataset["specific_humidity"].attrs = {"long_name": "Specific humidity", "units": "kg/kg", "derived_from": "TMP_prl,RH_prl,plevel", "derivation_formula": "0.622*e/(p-0.378*e), e=(RH/100)*6.112*exp(17.67*T_C/(T_C+243.5))"}
    iwv_values = (np.trapezoid(dataset["specific_humidity"].values, dataset.plevel.values[None, :, None, None] * 100.0, axis=1) / 9.80665).astype(np.float32)
    dataset["IWV"] = xr.DataArray(iwv_values, dims=("time", "latitude", "longitude"), coords={"time": dataset.time, "latitude": dataset.latitude, "longitude": dataset.longitude})
    dataset["IWV"].attrs = {"long_name": "Integrated water vapor", "units": "kg/m^2", "derived_from": "specific_humidity,plevel", "derivation_formula": "(1/9.80665)*trapezoidal_integral(q dp), pressure converted hPa to Pa"}
    return dataset


def load_year(year: int, reference: xr.Dataset | None) -> xr.Dataset:
    atmospheric = []
    for variable in ("HGT_prl", "RH_prl", "TMP_prl", "UGRD_prl", "VGRD_prl"):
        atmospheric.append(xr.open_dataset(find_file("Atmospheric_Variable", variable, year), decode_times=True, mask_and_scale=True))
    surface = [xr.open_dataset(find_file("Surface_variables", variable), decode_times=True, mask_and_scale=True).sel(time=slice(f"{year}-01-01", f"{year}-12-31 23:59:59")) for variable in ("APCP_sfc", "PRMSL_msl", "TMP_2m", "UGRD_10m", "VGRD_10m")]
    constants = [xr.open_dataset(find_file("Constants", variable), decode_times=True, mask_and_scale=True).sel(time=slice(f"{year}-01-01", f"{year}-12-31 23:59:59")) for variable in ("LAND_sfc", "MTERH_sfc")]
    opened = atmospheric + surface + constants
    try:
        dataset = xr.merge(opened, compat="equals", join="exact", combine_attrs="drop_conflicts").load()
    finally:
        for item in opened:
            item.close()
    if reference is not None:
        validate_grid(dataset, reference)
    return add_derived(dataset)


def encoding_for(dataset: xr.Dataset) -> dict:
    encoding = {}
    for name, variable in dataset.data_vars.items():
        encoding[name] = {"dtype": "float32" if np.issubdtype(variable.dtype, np.floating) else variable.dtype, "zlib": True, "complevel": 4, "shuffle": True}
    return encoding


def append_year(dataset: xr.Dataset, year: int) -> None:
    encoding = encoding_for(dataset)
    if year == 1990:
        dataset.to_netcdf(OUTPUT, mode="w", engine="netcdf4", encoding=encoding, unlimited_dims="time")
        return
    descriptor, temporary_name = tempfile.mkstemp(suffix=".nc", dir=ROOT)
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        dataset.to_netcdf(temporary, mode="w", engine="netcdf4", encoding=encoding, unlimited_dims="time")
        with NetCDFDataset(temporary, mode="r") as source:
            arrays = {name: np.array(variable[:]) for name, variable in source.variables.items() if "time" in variable.dimensions}
        with NetCDFDataset(OUTPUT, mode="a") as destination:
            old_size = len(destination.dimensions["time"])
            new_size = arrays["time"].shape[0]
            for name, values in arrays.items():
                destination.variables[name][old_size:old_size + new_size, ...] = values
            destination.sync()
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    inventory = inventory_sources()
    write_track("""## Completed\n- Inspected all raw NetCDF files recursively.\n- Created `data_inventory.csv`.\n\n## Currently Working On\n- Year-by-year temporal and spatial harmonization.\n\n## Pending\n- Derived variables\n- Final QC\n- Write and reopen `clustering_ready.nc`\n\n## Data Inventory\n- Raw NetCDF files: 162\n- Source root: `data/`\n- Atmospheric: 155 files across five variables and 1990–2020\n- Surface: 5 files; `TMP_2m` extends beyond 2020 and will be sliced to 1990–2020\n- Constants: 2 files\n\n## Variables\n- Atmospheric: HGT_prl, RH_prl, TMP_prl, UGRD_prl, VGRD_prl\n- Surface: APCP_sfc, PRMSL_msl, TMP_2m, UGRD_10m, VGRD_10m\n- Constants: LAND_sfc, MTERH_sfc\n\n## Decisions\n- Use the shared 1990–2020 6-hourly 32 × 32 geographic grid.\n- Process one year at a time because Dask is unavailable; do not load the archive into RAM.\n- Preserve source units and source variables.\n- Do not create event labels, clustering outputs, or pseudo-labels.\n""")
    if OUTPUT.exists():
        OUTPUT.unlink()
    reference = None
    yearly_stats = []
    for year in YEARS:
        dataset = load_year(year, reference)
        if reference is None:
            reference = dataset[["time", "latitude", "longitude", "plevel"]].copy(deep=True)
        dataset.attrs.update({"title": "Clustering-ready environmental dataset", "project": "India spatiotemporal hydrometeorological analysis", "description": "Unified IMDAA atmospheric, surface, constant, and physically derived variables. Contains no verified event labels.", "processing_stage": "Stage 1", "data_period": "1990-01-01 through 2020-12-31", "spatial_resolution": "approximately 1.08 degrees", "temporal_resolution": "6-hourly", "source_information": "IMDAA NetCDF files under data/"})
        append_year(dataset, year)
        for name, variable in dataset.data_vars.items():
            values = variable.values
            finite = values[np.isfinite(values)] if np.issubdtype(values.dtype, np.number) else np.array([])
            yearly_stats.append({"year": year, "variable": name, "missing_count": int(values.size - finite.size), "count": int(values.size), "min": float(finite.min()) if finite.size else np.nan, "max": float(finite.max()) if finite.size else np.nan, "mean": float(finite.mean()) if finite.size else np.nan})
        write_track(f"""## Completed\n- Inventory written to `data_inventory.csv`.\n- Processed years through {year}.\n\n## Currently Working On\n- {'Final QC and report.' if year == 2020 else f'Processing year {year + 1}.'}\n\n## Decisions\n- Yearly append processing avoids full-archive memory duplication.\n- `TMP_2m` was restricted to the common 1990–2020 period.\n""")
        dataset.close()

    stats = pd.DataFrame(yearly_stats)
    with xr.open_dataset(OUTPUT, decode_times=True, mask_and_scale=True) as verified:
        if verified.sizes["time"] != 31 * 365 * 4 + 8 * 4:
            raise RuntimeError(f"Unexpected final time count: {verified.sizes['time']}")
        if not np.all(np.diff(verified.time.values) == np.timedelta64(6, "h")):
            raise RuntimeError("Final time coordinate is not strictly 6-hourly")
        if not np.all(np.diff(verified.latitude.values) > 0) or not np.all(np.diff(verified.longitude.values) > 0):
            raise RuntimeError("Final spatial coordinates are not strictly increasing")
        final_dims = dict(verified.sizes)
        final_variables = list(verified.data_vars)
    stats.to_csv(ROOT / "stage1_variable_stats.csv", index=False)
    report = f"""# Stage 1 Report\n\n## Input files\n- Raw source root: `data/`\n- Inventory: `data_inventory.csv`\n- Files inventoried: {len(inventory)} NetCDF files\n\n## Common grid\n- Dimensions: `{final_dims}`\n- Latitude and longitude are strictly increasing.\n- Latitude/longitude spacing is approximately 1.08 degrees.\n- Geographic coordinate convention follows `degrees_north`/`degrees_east` source coordinates.\n\n## Common time resolution\n- 1990-01-01 00:00 through 2020-12-31 18:00.\n- Regular 6-hour cadence.\n- Surface `TMP_2m` source was sliced to this common period because it extends to 2023.\n\n## Spatial harmonization\n- No spatial interpolation was required: all source grids matched the 32 × 32 reference grid exactly.\n- No source variable was silently dropped.\n\n## Temporal harmonization\n- Atmospheric yearly files were merged by year.\n- Surface and constant files were sliced to each year.\n- No temporal interpolation was performed.\n- Precipitation `APCP_sfc` was preserved in its source `kg/m^2` units; no rate conversion was assumed.\n\n## Unit conversions\n- Source variables retain their inspected units.\n- Pressure levels are interpreted as hPa for IWV integration and converted to Pa only inside the formula.\n\n## Derived variables\n- `wind_speed_prl`: sqrt(UGRD_prl^2 + VGRD_prl^2), m/s.\n- `wind_direction_prl`: meteorological direction from U/V, degrees.\n- `wind_speed_10m`: sqrt(UGRD_10m^2 + VGRD_10m^2), m/s.\n- `wind_direction_10m`: meteorological direction from U/V, degrees.\n- `specific_humidity`: Magnus saturation vapor pressure and RH over pressure, kg/kg.\n- `IWV`: trapezoidal integral of specific humidity over pressure divided by 9.80665, kg/m^2.\n\n## Missing-data treatment\n- No blind imputation was performed.\n- Missing-value statistics are in `stage1_variable_stats.csv`.\n\n## Final variables\n{', '.join(final_variables)}\n\n## QC results\n- Final dimensions: `{final_dims}`\n- Final file reopened successfully.\n- Final time cadence and coordinate monotonicity validated.\n- No labels, clustering, or pseudo-labels were created.\n- Output size: {OUTPUT.stat().st_size} bytes.\n\n## Unresolved issues\n- Dask is not installed; the pipeline is scalable by yearly processing but uses in-memory yearly chunks.\n- No full-archive climatological anomalies were derived because a baseline was not specified.\n\n## Readiness\nThe output is ready as Stage 1 environmental input for clustering, subject to downstream review of missing-value statistics and available memory.\n"""
    REPORT.write_text(report, encoding="utf-8")
    write_track(f"""## Completed\n- Processed 1990–2020 year by year.\n- Created derived wind, humidity, and IWV variables.\n- Reopened and validated `clustering_ready.nc`.\n- Created `stage1_report.md` and `stage1_variable_stats.csv`.\n\n## Validation\n- Dimensions: `{final_dims}`\n- Variables: {len(final_variables)}\n- Time cadence: 6-hourly\n- Coordinates: monotonic, no spatial regridding required\n- Labels/clustering/pseudo-labels: none created\n\n## Outputs\n- `clustering_ready.nc`\n- `stage1_report.md`\n- `data_inventory.csv`\n- `stage1_variable_stats.csv`\n""", status="COMPLETE")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
    print("Dimensions:", final_dims)
    print("Variables:", final_variables)


if __name__ == "__main__":
    main()