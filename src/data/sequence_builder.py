"""
MEGHNETRA Weather Sequence Dataset & Spatiotemporal Data Cube Builder
Constructs standardized 5D tensor batches [B, T, C, H, W] for deep learning.
Separates numerical input tensors, target dictionaries, and metadata cleanly.
"""

from typing import Dict, Any, List, Optional
import torch
from torch.utils.data import Dataset
import numpy as np


class WeatherSequenceDataset(Dataset):
    """
    PyTorch Dataset for multi-hazard spatiotemporal nowcasting.
    Input tensor: [T, C, H, W]
    Target dictionary:
      - 'storm': [5, H, W] for horizons (+2h to +6h)
      - 'cloudburst': [5, H, W]
      - 'flash_flood': [5, H, W]
      - 'rainfall_rate': [5, H, W]
    Metadata:
      - 'analysis_timestamp': ISO timestamp of current analysis time t
      - 'horizons': [+2h, +3h, +4h, +5h, +6h]
    """

    def __init__(
        self,
        cubes: List[np.ndarray], # List of [T, C, H, W] arrays
        targets: List[Dict[str, np.ndarray]], # Target dicts
        metadata: List[Dict[str, Any]]
    ):
        self.cubes = cubes
        self.targets = targets
        self.metadata = metadata

    def __len__(self) -> int:
        return len(self.cubes)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        cube_arr = self.cubes[idx]
        target_dict = self.targets[idx]
        meta = self.metadata[idx]

        # Convert numerical arrays to FloatTensor
        inputs_tensor = torch.from_numpy(cube_arr).float()

        targets_tensor = {
            hazard_name: torch.from_numpy(t_arr).float()
            for hazard_name, t_arr in target_dict.items()
        }

        return {
            "inputs": inputs_tensor,
            "targets": targets_tensor,
            "metadata": meta
        }
