"""
MEGHNETRA Feature Engineering Engine
Derives physically and thermodynamically meaningful meteorological and terrain features.
Rules: Features are calculated ONLY when genuine underlying variables exist.
"""

from typing import Dict, Any, Optional
import numpy as np


class FeatureEngineer:
    """Computes meteorological tendencies, dynamic quantities, and terrain indices."""

    @staticmethod
    def derive_wind_speed(u: np.ndarray, v: np.ndarray) -> np.ndarray:
        """Calculates 10m horizontal wind speed: sqrt(u^2 + v^2)."""
        return np.sqrt(np.square(u) + np.square(v))

    @staticmethod
    def derive_wind_direction(u: np.ndarray, v: np.ndarray) -> np.ndarray:
        """Calculates wind direction in degrees: 180 + atan2(u, v) * 180/pi."""
        rad = np.arctan2(u, v)
        deg = (np.degrees(rad) + 180.0) % 360.0
        return deg

    @staticmethod
    def derive_tendency(curr: np.ndarray, prev: np.ndarray) -> np.ndarray:
        """Calculates 1-hour temporal tendency: X(t) - X(t-1)."""
        return curr - prev

    @staticmethod
    def derive_split_window_difference(tir1: np.ndarray, tir2: np.ndarray) -> np.ndarray:
        """Calculates TIR1 - TIR2 difference (atmospheric water vapour absorption proxy)."""
        return tir1 - tir2

    @staticmethod
    def derive_terrain_slope_and_aspect(elevation_grid: np.ndarray, dx_meters: float, dy_meters: float):
        """Calculates topographic slope in degrees from 2D elevation grid using central differences."""
        grad_y, grad_x = np.gradient(elevation_grid, dy_meters, dx_meters)
        slope_rad = np.arctan(np.sqrt(np.square(grad_x) + np.square(grad_y)))
        slope_deg = np.degrees(slope_rad)
        aspect_rad = np.arctan2(-grad_x, grad_y)
        aspect_deg = (np.degrees(aspect_rad) + 360.0) % 360.0
        return slope_deg, aspect_deg

    @staticmethod
    def derive_antecedent_precipitation_index(
        precip_history: np.ndarray,
        decay_constant: float = 0.85
    ) -> np.ndarray:
        """
        Calculates Antecedent Precipitation Index (API):
        API_t = P_t + k * API_{t-1}
        Serves as a hydrometeorological proxy for soil moisture saturation.
        """
        api = np.zeros_like(precip_history[0])
        for t in range(len(precip_history)):
            api = precip_history[t] + (decay_constant * api)
        return api
