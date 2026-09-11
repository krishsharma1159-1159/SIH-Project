"""
MEGHNETRA Spatial Regridding Engine
Standardizes diverse spatial grids (geostationary INSAT-3DR, 12km IMDAA, DEM raster)
onto a common geographic coordinate system (EPSG:4326) over Uttarakhand.
Calculates the true model resolution dynamically from the resulting grid.
"""

from typing import Dict, Any, Tuple, Optional
import numpy as np
import xarray as xr
from scipy.interpolate import RegularGridInterpolator


class SpatialRegridder:
    """Regrids scientific rasters to a unified regional domain grid."""

    def __init__(
        self,
        lat_min: float = 28.5,
        lat_max: float = 31.5,
        lon_min: float = 77.5,
        lon_max: float = 81.2,
        target_resolution_deg: float = 0.02
    ):
        self.lat_min = lat_min
        self.lat_max = lat_max
        self.lon_min = lon_min
        self.lon_max = lon_max
        self.target_res = target_resolution_deg

        # Construct target coordinates
        self.target_lats = np.arange(lat_min, lat_max + target_res / 2, target_res)
        self.target_lons = np.arange(lon_min, lon_max + target_res / 2, target_res)

        # Calculate actual physical grid spacing in kilometers (~111 km per deg lat, ~96 km per deg lon at 30°N)
        self.dlat_km = round(self.target_res * 111.0, 2)
        self.dlon_km = round(self.target_res * 111.0 * np.cos(np.radians(30.0)), 2)
        self.effective_resolution_km = round((self.dlat_km + self.dlon_km) / 2.0, 2)

    def get_grid_metadata(self) -> Dict[str, Any]:
        """Returns the real grid specifications."""
        return {
            "lat_bounds": [float(self.lat_min), float(self.lat_max)],
            "lon_bounds": [float(self.lon_min), float(self.lon_max)],
            "grid_shape": [len(self.target_lats), len(self.target_lons)],
            "resolution_degrees": self.target_res,
            "effective_resolution_km": self.effective_resolution_km,
            "crs": "EPSG:4326 (WGS84)",
            "latitude_points": len(self.target_lats),
            "longitude_points": len(self.target_lons),
        }

    def regrid_array(
        self,
        data: np.ndarray,
        src_lats: np.ndarray,
        src_lons: np.ndarray,
        method: str = "linear",
        fill_value: Optional[float] = np.nan
    ) -> np.ndarray:
        """Interpolates 2D array onto common target grid."""
        # Ensure monotonic ascending order
        if src_lats[0] > src_lats[-1]:
            src_lats = src_lats[::-1]
            data = data[::-1, :]
        if src_lons[0] > src_lons[-1]:
            src_lons = src_lons[::-1]
            data = data[:, ::-1]

        interp = RegularGridInterpolator(
            (src_lats, src_lons),
            data,
            method=method,
            bounds_error=False,
            fill_value=fill_value
        )

        mesh_lat, mesh_lon = np.meshgrid(self.target_lats, self.target_lons, indexing="ij")
        points = np.stack([mesh_lat.ravel(), mesh_lon.ravel()], axis=-1)
        res = interp(points).reshape(len(self.target_lats), len(self.target_lons))
        return res
