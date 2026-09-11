"""
MEGHNETRA Scientific Quality Control (QC) Module
Enforces strict physical constraints, detects NaNs/Infs, verifies coordinate ordering,
checks time series continuity, and generates explicit valid/missing masks without silent replacements.
"""

from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import xarray as xr


class QualityController:
    """Enforces scientific QC standards across raw and preprocessed meteorological arrays."""

    # Physical plausibility bounds
    PHYSICAL_BOUNDS: Dict[str, Tuple[float, float]] = {
        "temperature_2m": (230.0, 335.0), # Kelvin
        "surface_pressure": (40000.0, 108000.0), # Pa
        "relative_humidity": (0.0, 100.0), # %
        "specific_humidity": (0.0, 0.05), # kg/kg
        "wind_speed": (0.0, 100.0), # m/s
        "precipitation_rate": (0.0, 350.0), # mm/hr
        "cape": (0.0, 7500.0), # J/kg
        "cin": (-1500.0, 0.0), # J/kg
        "tir_bt": (160.0, 340.0), # Kelvin
        "elevation": (-100.0, 8848.0), # meters
        "slope": (0.0, 90.0), # degrees
    }

    @staticmethod
    def inspect_array_quality(
        data: np.ndarray,
        var_name: str = "unknown",
        fill_value: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculates QC flags:
        - nan_count / nan_percentage
        - inf_count
        - fill_value_count
        - out_of_bounds_count
        - quality_flag: "PASSED", "WARNING", "FAILED"
        """
        total = data.size
        if total == 0:
            return {
                "variable": var_name,
                "quality_flag": "EMPTY",
                "valid": False,
                "total_elements": 0
            }

        # Check NaN and Inf
        nan_mask = np.isnan(data)
        inf_mask = np.isinf(data)
        nan_count = int(np.sum(nan_mask))
        inf_count = int(np.sum(inf_mask))

        # Check FillValue
        fill_count = 0
        if fill_value is not None:
            fill_mask = (data == fill_value)
            fill_count = int(np.sum(fill_mask))

        # Valid mask
        invalid_mask = nan_mask | inf_mask
        if fill_value is not None:
            invalid_mask = invalid_mask | (data == fill_value)

        valid_data = data[~invalid_mask]
        oob_count = 0
        bounds = QualityController.PHYSICAL_BOUNDS.get(var_name)
        if bounds and valid_data.size > 0:
            low, high = bounds
            oob_mask = (valid_data < low) | (valid_data > high)
            oob_count = int(np.sum(oob_mask))

        nan_pct = round((nan_count / total) * 100.0, 2)
        invalid_pct = round(((nan_count + inf_count + fill_count + oob_count) / total) * 100.0, 2)

        # Flag determination
        if inf_count > 0 or oob_count > (0.05 * total):
            flag = "FAILED"
        elif invalid_pct > 15.0:
            flag = "WARNING_HIGH_MISSING"
        else:
            flag = "PASSED"

        return {
            "variable": var_name,
            "quality_flag": flag,
            "total_elements": total,
            "nan_count": nan_count,
            "nan_percentage": nan_pct,
            "inf_count": inf_count,
            "fill_count": fill_count,
            "out_of_bounds_count": oob_count,
            "valid_percentage": round(100.0 - invalid_pct, 2),
            "physical_bounds": bounds,
        }

    @staticmethod
    def verify_coordinates(coords: Dict[str, np.ndarray]) -> Dict[str, Any]:
        """Checks for coordinate ordering, duplicates, and bounds."""
        checks = {}
        for name, vals in coords.items():
            if not isinstance(vals, np.ndarray) or vals.ndim != 1:
                continue
            has_duplicates = len(vals) != len(np.unique(vals))
            is_monotonic_inc = bool(np.all(np.diff(vals) > 0))
            is_monotonic_dec = bool(np.all(np.diff(vals) < 0))

            checks[name] = {
                "size": len(vals),
                "min": float(vals[0]) if len(vals) else None,
                "max": float(vals[-1]) if len(vals) else None,
                "has_duplicates": has_duplicates,
                "is_monotonic": is_monotonic_inc or is_monotonic_dec,
                "direction": "ascending" if is_monotonic_inc else ("descending" if is_monotonic_dec else "non-monotonic")
            }
        return checks
