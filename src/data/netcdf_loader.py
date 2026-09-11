"""
MEGHNETRA NetCDF Inspector & Loader
Provides inspection, metadata extraction, coordinate analysis, and quality auditing
for NetCDF3, NetCDF4/HDF5, and related scientific multi-dimensional raster files.
"""

from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import xarray as xr
import netCDF4 as nc


class NetCDFLoader:
    """Robust NetCDF loader and auditor that never assumes variable or coordinate names."""

    @staticmethod
    def inspect_file(file_path: Path) -> Dict[str, Any]:
        """
        Thoroughly inspects a NetCDF file and extracts:
        - file format & engine
        - dimensions and their sizes
        - coordinates and coordinate values/ranges
        - variables, data types, shapes, attributes (units, fill values)
        - summary statistics (min, max, mean, NaN percentage)
        - temporal resolution & extent
        - geographic bounds
        """
        path = Path(file_path)
        if not path.exists():
            return {
                "filename": str(path.name),
                "error": f"File does not exist: {path}",
                "valid": False
            }

        file_size_bytes = path.stat().st_size

        try:
            # First attempt with xarray
            ds = xr.open_dataset(path, engine="netcdf4")
        except Exception as err_xr:
            try:
                # Fallback to h5netcdf or scipy if needed
                ds = xr.open_dataset(path)
            except Exception as err2:
                # Direct netCDF4 inspection
                try:
                    with nc.Dataset(path, 'r') as nc_ds:
                        return NetCDFLoader._inspect_raw_nc(path, nc_ds, file_size_bytes)
                except Exception as err_raw:
                    return {
                        "filename": path.name,
                        "file_path": str(path),
                        "file_size_bytes": file_size_bytes,
                        "error": f"Failed to open NetCDF: {str(err_xr)} | Raw: {str(err_raw)}",
                        "valid": False
                    }

        try:
            dims = {str(k): int(v) for k, v in ds.sizes.items()}
            coords_info = {}
            for coord_name, coord_var in ds.coords.items():
                coord_vals = coord_var.values
                coord_meta: Dict[str, Any] = {
                    "shape": list(coord_vals.shape),
                    "dtype": str(coord_vals.dtype),
                }
                if coord_vals.size > 0:
                    if np.issubdtype(coord_vals.dtype, np.datetime64):
                        coord_meta["min"] = str(np.min(coord_vals))
                        coord_meta["max"] = str(np.max(coord_vals))
                        if len(coord_vals) > 1:
                            # Estimate time step
                            diffs = np.diff(coord_vals)
                            coord_meta["estimated_step"] = str(diffs[0])
                    elif np.issubdtype(coord_vals.dtype, np.number):
                        coord_meta["min"] = float(np.nanmin(coord_vals))
                        coord_meta["max"] = float(np.nanmax(coord_vals))
                coords_info[str(coord_name)] = coord_meta

            # Geographic bounds determination
            geo_bounds = NetCDFLoader._extract_geographic_bounds(ds)

            # Variable inspection
            variables_info = {}
            for var_name, data_array in ds.data_vars.items():
                attrs = {k: str(v) for k, v in data_array.attrs.items()}
                units = attrs.get("units", attrs.get("unit", "dimensionless"))
                
                # Compute fast statistics (subsample if large to prevent memory overflow)
                stats = NetCDFLoader._compute_variable_stats(data_array)

                variables_info[str(var_name)] = {
                    "dtype": str(data_array.dtype),
                    "dimensions": [str(d) for d in data_array.dims],
                    "shape": list(data_array.shape),
                    "units": units,
                    "attributes": attrs,
                    "min": stats["min"],
                    "max": stats["max"],
                    "mean": stats["mean"],
                    "nan_count": stats["nan_count"],
                    "nan_percentage": stats["nan_percentage"],
                    "total_elements": stats["total_elements"],
                }

            # Global attributes
            global_attrs = {str(k): str(v) for k, v in ds.attrs.items()}

            ds.close()

            return {
                "filename": path.name,
                "file_path": str(path),
                "file_size_bytes": file_size_bytes,
                "file_size_mb": round(file_size_bytes / (1024 * 1024), 2),
                "valid": True,
                "dimensions": dims,
                "coordinates": coords_info,
                "variables": variables_info,
                "geographic_bounds": geo_bounds,
                "global_attributes": global_attrs,
            }

        except Exception as e:
            ds.close()
            return {
                "filename": path.name,
                "file_path": str(path),
                "error": f"Error during metadata extraction: {str(e)}",
                "valid": False
            }

    @staticmethod
    def _compute_variable_stats(da: xr.DataArray) -> Dict[str, Any]:
        """Calculates min, max, mean, and NaN percentage safely."""
        total_elements = int(da.size)
        if total_elements == 0:
            return {"min": None, "max": None, "mean": None, "nan_count": 0, "nan_percentage": 0.0, "total_elements": 0}

        # If data is massive (> 5,000,000 elements), subsample for audit performance
        if total_elements > 5_000_000:
            sub = da.values.ravel()
            step = max(1, total_elements // 500_000)
            sample = sub[::step]
        else:
            sample = da.values.ravel()

        if not np.issubdtype(sample.dtype, np.number):
            return {"min": "N/A (non-numeric)", "max": "N/A", "mean": "N/A", "nan_count": 0, "nan_percentage": 0.0, "total_elements": total_elements}

        # Identify fill values from attributes or extreme float flags
        fill_val = da.attrs.get("_FillValue", da.attrs.get("missing_value"))
        
        nan_mask = np.isnan(sample)
        inf_mask = np.isinf(sample)
        extreme_mask = (sample > 1e30) | (sample < -1e30)
        if fill_val is not None:
            fill_mask = (sample == fill_val) | extreme_mask
        else:
            fill_mask = extreme_mask

        invalid_mask = nan_mask | inf_mask | fill_mask
        nan_count = int(np.sum(invalid_mask))
        nan_pct = round((nan_count / len(sample)) * 100.0, 2)

        valid_sample = sample[~invalid_mask]
        if len(valid_sample) == 0:
            return {"min": None, "max": None, "mean": None, "nan_count": nan_count, "nan_percentage": 100.0, "total_elements": total_elements}

        return {
            "min": round(float(np.min(valid_sample)), 4),
            "max": round(float(np.max(valid_sample)), 4),
            "mean": round(float(np.mean(valid_sample)), 4),
            "nan_count": nan_count,
            "nan_percentage": nan_pct,
            "total_elements": total_elements,
        }

    @staticmethod
    def _extract_geographic_bounds(ds: xr.Dataset) -> Dict[str, Optional[float]]:
        """Extracts lat/lon bounds from coords without assuming exact naming."""
        lat_names = ["lat", "latitude", "LAT", "LATITUDE", "lat_2m", "grid_lat"]
        lon_names = ["lon", "longitude", "LON", "LONGITUDE", "lon_2m", "grid_lon"]

        lat_min, lat_max = None, None
        lon_min, lon_max = None, None

        for name in lat_names:
            if name in ds.coords or name in ds.variables:
                vals = ds[name].values
                if vals.size > 0:
                    lat_min = float(np.nanmin(vals))
                    lat_max = float(np.nanmax(vals))
                    break

        for name in lon_names:
            if name in ds.coords or name in ds.variables:
                vals = ds[name].values
                if vals.size > 0:
                    lon_min = float(np.nanmin(vals))
                    lon_max = float(np.nanmax(vals))
                    break

        return {
            "lat_min": lat_min,
            "lat_max": lat_max,
            "lon_min": lon_min,
            "lon_max": lon_max,
        }

    @staticmethod
    def _inspect_raw_nc(path: Path, ds: nc.Dataset, size: int) -> Dict[str, Any]:
        """Fallback raw netCDF4 inspection."""
        dims = {k: len(v) for k, v in ds.dimensions.items()}
        vars_info = {}
        for k, v in ds.variables.items():
            vars_info[k] = {
                "dtype": str(v.dtype),
                "dimensions": list(v.dimensions),
                "shape": list(v.shape),
                "units": getattr(v, 'units', 'dimensionless'),
            }
        return {
            "filename": path.name,
            "file_path": str(path),
            "file_size_bytes": size,
            "valid": True,
            "dimensions": dims,
            "variables": vars_info,
            "inspection_engine": "netCDF4-raw",
        }
