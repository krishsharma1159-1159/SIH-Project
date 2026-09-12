"""
convlstm_model.py
Multi-Head ConvLSTM for spatiotemporal environmental hazard pseudo-label prediction.

Architecture:
    Shared ConvLSTM backbone -> Thunderstorm Head
                             -> Cloudburst Head
                             -> Flash Flood Head
"""
from __future__ import annotations
import torch
import torch.nn as nn
from torch import Tensor


# ── ConvLSTM Cell ─────────────────────────────────────────────────────────────
class ConvLSTMCell(nn.Module):
    """Single ConvLSTM cell.

    Input: (B, C_in, H, W)
    Hidden/Cell: (B, hidden_channels, H, W)
    """

    def __init__(self, in_channels: int, hidden_channels: int, kernel_size: int = 3):
        super().__init__()
        padding = kernel_size // 2
        self.hidden_channels = hidden_channels
        # Gates: input, forget, output, cell — all 4 in one conv
        self.gates = nn.Conv2d(
            in_channels + hidden_channels,
            4 * hidden_channels,
            kernel_size=kernel_size,
            padding=padding,
            bias=True,
        )
        # Layer norm for training stability
        self.ln = nn.LayerNorm([hidden_channels, 32, 32])

    def forward(
        self, x: Tensor, h: Tensor, c: Tensor
    ) -> tuple[Tensor, Tensor]:
        xh = torch.cat([x, h], dim=1)          # (B, C_in+hidden, H, W)
        gates = self.gates(xh)                  # (B, 4*hidden, H, W)
        i, f, o, g = gates.chunk(4, dim=1)

        i = torch.sigmoid(i)
        f = torch.sigmoid(f)
        o = torch.sigmoid(o)
        g = torch.tanh(g)

        c_new = f * c + i * g
        h_new = o * torch.tanh(self.ln(c_new))
        return h_new, c_new

    def init_hidden(self, batch: int, device: torch.device) -> tuple[Tensor, Tensor]:
        zeros = torch.zeros(batch, self.hidden_channels, 32, 32, device=device)
        return zeros, zeros.clone()


# ── Shared ConvLSTM Backbone ──────────────────────────────────────────────────
class ConvLSTMBackbone(nn.Module):
    """Stacked ConvLSTM backbone.

    Processes input sequence [B, T, C, H, W] and returns
    the final hidden state [B, hidden_channels[-1], H, W].
    """

    def __init__(
        self,
        in_channels: int,
        hidden_channels: list[int],
        kernel_size: int = 3,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.cells = nn.ModuleList()
        prev = in_channels
        for hc in hidden_channels:
            self.cells.append(ConvLSTMCell(prev, hc, kernel_size))
            prev = hc
        self.dropout = nn.Dropout2d(dropout)
        self.out_channels = prev

    def forward(self, x: Tensor) -> Tensor:
        """
        x: (B, T, C, H, W)
        returns: (B, out_channels, H, W) — final hidden state of last layer
        """
        B, T, C, H, W = x.shape

        # Initialise hidden and cell states for all layers
        hs, cs = [], []
        for cell in self.cells:
            h, c = cell.init_hidden(B, x.device)
            hs.append(h)
            cs.append(c)

        # Unroll over time
        for t in range(T):
            inp = x[:, t]                        # (B, C, H, W)
            for i, cell in enumerate(self.cells):
                hs[i], cs[i] = cell(inp, hs[i], cs[i])
                inp = self.dropout(hs[i])         # dropout between layers

        return hs[-1]                             # (B, out_channels, H, W)


# ── Task-Specific Prediction Head ─────────────────────────────────────────────
class HazardHead(nn.Module):
    """Lightweight independent head for one hazard class.

    in_channels -> Conv3x3 -> BN -> ReLU -> Conv1x1 -> logits (1 channel)
    """

    def __init__(self, in_channels: int, mid_channels: int = 32):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_channels, mid_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(mid_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(mid_channels, 1, kernel_size=1, bias=True),
        )

    def forward(self, x: Tensor) -> Tensor:
        """x: (B, in_channels, H, W)  ->  (B, 1, H, W) logits"""
        return self.net(x)


# ── Multi-Head ConvLSTM ────────────────────────────────────────────────────────
class MultiHeadConvLSTM(nn.Module):
    """
    Shared ConvLSTM spatiotemporal backbone with three independent
    task-specific prediction heads for:
        - Thunderstorm pseudo-label
        - Cloudburst pseudo-label
        - Flash Flood pseudo-label

    Input shape:  [B, T, C, H, W]
    Output shape: [B, 3, H, W]  (logits — no sigmoid applied here)
    """

    def __init__(
        self,
        in_channels: int,
        hidden_channels: list[int] = [32, 32],
        kernel_size: int = 3,
        head_mid_channels: int = 32,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.backbone = ConvLSTMBackbone(
            in_channels=in_channels,
            hidden_channels=hidden_channels,
            kernel_size=kernel_size,
            dropout=dropout,
        )
        backbone_out = self.backbone.out_channels

        # Three INDEPENDENT heads
        self.thunderstorm_head = HazardHead(backbone_out, head_mid_channels)
        self.cloudburst_head   = HazardHead(backbone_out, head_mid_channels)
        self.flash_flood_head  = HazardHead(backbone_out, head_mid_channels)

    def forward(self, x: Tensor) -> dict[str, Tensor]:
        """
        x: (B, T, C, 32, 32)  — ConvLSTM input sequence
        Returns dict with:
            'thunderstorm' : (B, 1, 32, 32) logits
            'cloudburst'   : (B, 1, 32, 32) logits
            'flash_flood'  : (B, 1, 32, 32) logits
            'logits'       : (B, 3, 32, 32) concatenated logits
        """
        shared = self.backbone(x)             # (B, hidden[-1], 32, 32)

        ts  = self.thunderstorm_head(shared)  # (B, 1, 32, 32)
        cb  = self.cloudburst_head(shared)    # (B, 1, 32, 32)
        ff  = self.flash_flood_head(shared)   # (B, 1, 32, 32)

        logits = torch.cat([ts, cb, ff], dim=1)   # (B, 3, 32, 32)

        return {
            "thunderstorm": ts,
            "cloudburst":   cb,
            "flash_flood":  ff,
            "logits":       logits,
        }

    def count_parameters(self) -> dict[str, int]:
        total  = sum(p.numel() for p in self.parameters())
        bb     = sum(p.numel() for p in self.backbone.parameters())
        ts_p   = sum(p.numel() for p in self.thunderstorm_head.parameters())
        cb_p   = sum(p.numel() for p in self.cloudburst_head.parameters())
        ff_p   = sum(p.numel() for p in self.flash_flood_head.parameters())
        return {
            "total": total,
            "backbone": bb,
            "thunderstorm_head": ts_p,
            "cloudburst_head":   cb_p,
            "flash_flood_head":  ff_p,
        }


# ── Quick sanity check ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Device:", device)

    B, T, C, H, W = 2, 12, 18, 32, 32
    model = MultiHeadConvLSTM(
        in_channels=C,
        hidden_channels=[32, 32],
        kernel_size=3,
        head_mid_channels=32,
    ).to(device)

    x = torch.randn(B, T, C, H, W, device=device)
    out = model(x)

    print("Input shape :", x.shape)
    print("Thunderstorm:", out["thunderstorm"].shape)
    print("Cloudburst  :", out["cloudburst"].shape)
    print("Flash Flood :", out["flash_flood"].shape)
    print("Logits      :", out["logits"].shape)
    print("Parameters  :", model.count_parameters())
