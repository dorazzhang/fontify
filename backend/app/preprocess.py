"""Turn live-canvas PNGs into binary ink masks in font space helpers."""

from __future__ import annotations

import numpy as np
from PIL import Image

# Live pad guides: band bottom ≈ baseline (see WritingGuides.css)
BASELINE_FROM_TOP = 0.74
UPM = 1000
ASCENDER = 1050
DESCENDER = -320


def load_ink_mask(png_bytes: bytes) -> np.ndarray:
    """Return uint8 mask (255 = ink) from a transparent or light-background PNG."""
    img = Image.open(__import__("io").BytesIO(png_bytes)).convert("RGBA")
    arr = np.asarray(img)
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)
    # Luminance; canvas ink is dark (#2c3540) on transparent/clear
    gray = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    # Only visible pixels can be ink. Transparent (0,0,0,0) must NOT count —
    # otherwise the whole canvas becomes a solid black rectangle glyph.
    ink = (alpha > 16) & (gray < 210)
    return np.where(ink, np.uint8(255), np.uint8(0))


def ink_bbox(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
