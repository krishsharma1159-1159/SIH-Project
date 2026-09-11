"""
MEGHNETRA Temporal Alignment Engine
Harmonizes variable temporal frequencies (30-min INSAT-3DR, 1h IMDAA, sub-hourly radar)
onto a common 1-hour temporal baseline without violating physical accumulation rules.
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np


class TemporalAligner:
    """Aligns multi-source time series and grid sequences."""

    def __init__(self, target_frequency: str = "1h"):
        self.target_freq = target_frequency

    def build_time_index(self, start_time: str, end_time: str) -> pd.DatetimeIndex:
        """Constructs canonical temporal grid."""
        return pd.date_range(start=start_time, end=end_time, freq=self.target_freq)

    @staticmethod
    def align_variable(
        values: np.ndarray,
        source_times: pd.DatetimeIndex,
        target_times: pd.DatetimeIndex,
        aggregation: str = "instantaneous"
    ) -> np.ndarray:
        """
        Resamples a series or grid across time:
        - 'instantaneous' (temperature, pressure, wind): nearest or linear interpolation
        - 'accumulation' (precipitation): sum over preceding window
        - 'maximum' (reflectivity, gust): max over window
        """
        if len(source_times) == 0:
            raise ValueError("source_times is empty.")

        # Temporal alignment logic
        df = pd.DataFrame({"val": values.reshape(len(source_times), -1).tolist()}, index=source_times)
        
        if aggregation == "accumulation":
            resampled = df.resample("1h").sum()
        elif aggregation == "maximum":
            resampled = df.resample("1h").max()
        else:
            resampled = df.resample("1h").interpolate(method="time").ffill().bfill()

        aligned = resampled.reindex(target_times)
        return aligned.values
