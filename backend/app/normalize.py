"""Shared metrics + stroke/size normalization for live glyphs."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from .preprocess import ink_bbox

# Target font units (UPM=1000)
CAP_HEIGHT = 820
X_HEIGHT = 560
SIDE_BEARING = 52


@dataclass
class CorpusMetrics:
    """Shared scale/thickness so every glyph feels like one hand."""

    px_to_unit: float
    baseline_from_top: float
    target_stroke_px: float
    median_cap_height_px: float
    median_stroke_px: float


def estimate_stroke_width_px(mask: np.ndarray) -> float:
    """Rough stroke diameter via distance transform."""
    if mask is None or not np.any(mask):
        return 0.0
    work = (mask > 0).astype(np.uint8)
    dist = cv2.distanceTransform(work, cv2.DIST_L2, 5)
    radii = dist[work > 0]
    if radii.size == 0:
        return 0.0
    # Diameter ≈ 2 * median radius along the ink skeleton
    return float(np.median(radii) * 2.0)


def compute_corpus_metrics(
    masks: dict[str, np.ndarray],
    *,
    baseline_from_top: float,
) -> CorpusMetrics:
    cap_heights: list[float] = []
    x_heights: list[float] = []
    strokes: list[float] = []

    for ch, mask in masks.items():
        box = ink_bbox(mask)
        if box is None:
            continue
        _x0, y0, _x1, y1 = box
        height = float(y1 - y0 + 1)
        stroke = estimate_stroke_width_px(mask)
        if stroke > 0.5:
            strokes.append(stroke)
        if ch.isupper():
            cap_heights.append(height)
        elif ch.islower():
            x_heights.append(height)
        else:
            # digits / symbols contribute to overall size prior
            cap_heights.append(height)

    median_stroke = float(np.median(strokes)) if strokes else 4.0
    # Aim thicker than the median handwriting so installs stay legible
    target_stroke = float(np.clip(median_stroke * 1.55, 5.0, 22.0))

    if cap_heights:
        median_cap = float(np.median(cap_heights))
        px_to_unit = CAP_HEIGHT / max(median_cap, 1.0)
    elif x_heights:
        median_cap = float(np.median(x_heights)) * (CAP_HEIGHT / X_HEIGHT)
        px_to_unit = X_HEIGHT / max(float(np.median(x_heights)), 1.0)
    else:
        median_cap = 80.0
        px_to_unit = CAP_HEIGHT / median_cap

    # Prefer slightly larger type in the em square
    px_to_unit = float(np.clip(px_to_unit * 1.08, 0.5, 24.0))
    median_cap = float(median_cap)

    return CorpusMetrics(
        px_to_unit=px_to_unit,
        baseline_from_top=baseline_from_top,
        target_stroke_px=target_stroke,
        median_cap_height_px=median_cap,
        median_stroke_px=median_stroke,
    )


def normalize_stroke_thickness(mask: np.ndarray, target_stroke_px: float) -> np.ndarray:
    """Dilate/erode ink so stroke thickness matches the corpus target."""
    current = estimate_stroke_width_px(mask)
    if current <= 0:
        return mask

    out = (mask > 0).astype(np.uint8) * 255
    delta = target_stroke_px - current
    if abs(delta) < 0.6:
        return out

    # One morph step ≈ ~1–2px with a 3x3 ellipse
    steps = int(round(abs(delta) / 1.6))
    steps = max(1, min(steps, 8))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    if delta > 0:
        out = cv2.dilate(out, kernel, iterations=steps)
    else:
        out = cv2.erode(out, kernel, iterations=steps)
        # Avoid wiping out thin bridges entirely
        if not np.any(out):
            return (mask > 0).astype(np.uint8) * 255
        out = cv2.dilate(out, kernel, iterations=1)
    return out
