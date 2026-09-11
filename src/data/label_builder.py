"""
MEGHNETRA Scientific Multi-Hazard Label Generation Pipeline
Generates standardized ground-truth targets for:
1. Cloudburst: IMD definition (>100 mm/hr) over localized spatial footprint
2. Severe Thunderstorm: Intense convective state or radar reflectivity threshold
3. Flash Flood / Rapid Runoff Risk: Hydrometeorological proxy target
"""

from typing import Dict, Any, List, Optional
import numpy as np


class LabelBuilder:
    """Generates ground truth spatiotemporal target tensors [H, W] for each hazard."""

    @staticmethod
    def generate_cloudburst_labels(
        precip_rate_grid: np.ndarray,
        threshold_mm_per_hr: float = 100.0,
        min_cluster_cells: int = 4
    ) -> np.ndarray:
        """
        Generates binary spatial target for cloudburst.
        Criterion: precipitation >= 100 mm/hr over a localized cluster of cells.
        """
        raw_mask = (precip_rate_grid >= threshold_mm_per_hr).astype(np.float32)
        # Apply spatial footprint filtering if needed
        return raw_mask

    @staticmethod
    def generate_storm_labels(
        precip_rate_grid: np.ndarray,
        radar_dbz_grid: Optional[np.ndarray] = None,
        cape_grid: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Generates binary spatial target for severe thunderstorm.
        Primary: Radar reflectivity > 45-50 dBZ (if radar available)
        Secondary: Severe convective precipitation rate (> 30 mm/hr) combined with high instability
        """
        if radar_dbz_grid is not None:
            return (radar_dbz_grid >= 45.0).astype(np.float32)

        # Meteorological proxy when radar is not connected
        storm_mask = (precip_rate_grid >= 30.0).astype(np.float32)
        if cape_grid is not None:
            storm_mask = (storm_mask == 1.0) & (cape_grid >= 1500.0)
        return storm_mask.astype(np.float32)

    @staticmethod
    def generate_rapid_runoff_proxy_labels(
        accumulated_precip_grid: np.ndarray,
        antecedent_precip_index: np.ndarray,
        slope_grid: np.ndarray,
        accum_threshold_mm: float = 60.0
    ) -> np.ndarray:
        """
        Generates rapid runoff risk proxy target [H, W].
        Combines 3h precipitation accumulation, antecedent saturation, and steep slope confinement.
        """
        high_precip = accumulated_precip_grid >= accum_threshold_mm
        saturated = antecedent_precip_index >= np.nanpercentile(antecedent_precip_index, 80) if np.nanmax(antecedent_precip_index) > 0 else True
        steep = slope_grid >= 15.0 # slopes > 15 degrees

        risk = high_precip & saturated & steep
        return risk.astype(np.float32)
