"""Bitmap → TrueType glyph outlines via OpenCV contours."""

from __future__ import annotations

import cv2
import numpy as np
from fontTools.pens.ttGlyphPen import TTGlyphPen

from .normalize import (
    CAP_HEIGHT,
    SIDE_BEARING,
    X_HEIGHT,
    CorpusMetrics,
    estimate_stroke_width_px,
)
from .preprocess import ink_bbox

# Canonical raster height (px) before vectorizing — keeps weight even after resize
CANON_CAP_PX = 180
CANON_X_PX = 124


def _stride_sample(contour: np.ndarray, max_points: int = 400) -> np.ndarray:
    pts = contour.reshape(-1, 2)
    n = len(pts)
    if n <= max_points:
        return pts
    idx = np.linspace(0, n - 1, num=max_points, dtype=int)
    return pts[idx]


def _signed_area(pts: np.ndarray) -> float:
    x = pts[:, 0].astype(np.float64)
    y = pts[:, 1].astype(np.float64)
    return 0.5 * float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def _role_heights(ch: str | None) -> tuple[float, int]:
    """Return (target font units height, canonical raster px height)."""
    if not ch:
        return CAP_HEIGHT, CANON_CAP_PX
    if ch.isupper() or ch.isdigit():
        return CAP_HEIGHT, CANON_CAP_PX
    if ch.islower():
        if ch in set("bdfhijkltd"):
            return CAP_HEIGHT * 0.92, int(CANON_CAP_PX * 0.92)
        if ch in set("gjpqy"):
            return CAP_HEIGHT * 0.92, int(CANON_CAP_PX * 0.92)
        return X_HEIGHT, CANON_X_PX
    if ch in set(".,"):
        return CAP_HEIGHT * 0.14, max(int(CANON_CAP_PX * 0.14), 16)
    if ch in set("-"):
        return CAP_HEIGHT * 0.12, max(int(CANON_CAP_PX * 0.12), 12)
    if ch in set("!?"):
        return CAP_HEIGHT, CANON_CAP_PX
    return CAP_HEIGHT * 0.85, int(CANON_CAP_PX * 0.85)


def _match_stroke(mask: np.ndarray, target: float) -> np.ndarray:
    out = (mask > 0).astype(np.uint8) * 255
    current = estimate_stroke_width_px(out)
    if current <= 0:
        return out
    delta = target - current
    if abs(delta) < 0.5:
        return out
    steps = int(np.clip(round(abs(delta) / 1.4), 1, 10))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    if delta > 0:
        return cv2.dilate(out, kernel, iterations=steps)
    eroded = cv2.erode(out, kernel, iterations=steps)
    if not np.any(eroded):
        return out
    return eroded


def _to_canonical_raster(
    mask: np.ndarray,
    *,
    canon_h: int,
    baseline_from_top: float,
) -> tuple[np.ndarray, float]:
    """
    Crop ink, resize to canonical height, place on a padded canvas.

    Returns (canonical_mask, baseline_y_px on that canvas).
    """
    box = ink_bbox(mask)
    if box is None:
        return np.zeros((canon_h + 80, canon_h + 80), np.uint8), canon_h * 0.85

    x0, y0, x1, y1 = box
    pad = 6
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(mask.shape[1] - 1, x1 + pad)
    y1 = min(mask.shape[0] - 1, y1 + pad)
    crop = (mask[y0 : y1 + 1, x0 : x1 + 1] > 0).astype(np.uint8) * 255
    ch_h = max(crop.shape[0], 1)
    ch_w = max(crop.shape[1], 1)

    new_h = max(canon_h, 8)
    new_w = max(int(round(ch_w * (new_h / ch_h))), 4)
    resized = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_AREA)
    _, resized = cv2.threshold(resized, 40, 255, cv2.THRESH_BINARY)

    # Canvas with room for descenders/bearing
    canvas_h = new_h + 100
    canvas_w = new_w + 80
    canvas = np.zeros((canvas_h, canvas_w), dtype=np.uint8)

    # Map original baseline into the crop, then into resized space
    src_h = mask.shape[0]
    src_baseline = baseline_from_top * src_h
    baseline_in_crop = src_baseline - y0
    baseline_in_resized = baseline_in_crop * (new_h / ch_h)

    top = 40
    left = 40
    canvas[top : top + new_h, left : left + new_w] = np.maximum(
        canvas[top : top + new_h, left : left + new_w],
        resized,
    )
    baseline_y = top + baseline_in_resized
    return canvas, float(baseline_y)


def mask_to_glyph(
    mask: np.ndarray,
    metrics: CorpusMetrics,
    *,
    character: str | None = None,
    side_bearing: int = SIDE_BEARING,
) -> tuple[object, int]:
    h, w = mask.shape
    if h < 1 or w < 1:
        return TTGlyphPen(None).glyph(), side_bearing * 2

    ink_ratio = float(np.count_nonzero(mask)) / float(mask.size)
    if ink_ratio > 0.35:
        raise ValueError(
            f"Glyph mask looks inverted or blank-filled ({ink_ratio:.0%} ink). "
            "Expected sparse handwriting strokes."
        )

    target_units, canon_px = _role_heights(character)
    canon, baseline_y = _to_canonical_raster(
        mask,
        canon_h=canon_px,
        baseline_from_top=metrics.baseline_from_top,
    )

    # Target stroke on the canonical raster (same for every glyph role)
    target_stroke = float(
        np.clip(metrics.target_stroke_px * (canon_px / max(metrics.median_cap_height_px, 1.0)), 4.0, 20.0)
    )
    work = _match_stroke(canon, target_stroke)
    work = cv2.dilate(
        work, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1
    )

    scale = target_units / float(canon_px)

    contours, hierarchy = cv2.findContours(
        work, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE
    )
    if not contours or hierarchy is None:
        return TTGlyphPen(None).glyph(), side_bearing * 2

    hierarchy = hierarchy[0]
    paths: list[np.ndarray] = []
    min_x = float("inf")
    max_x = float("-inf")

    for idx, contour in enumerate(contours):
        parent = int(hierarchy[idx][3])
        if parent != -1 and int(hierarchy[parent][3]) != -1:
            continue
        if abs(cv2.contourArea(contour)) < 10:
            continue
        pts = _stride_sample(contour)
        if len(pts) < 3:
            continue

        is_hole = parent != -1
        font_pts = np.column_stack(
            [
                pts[:, 0] * scale,
                (baseline_y - pts[:, 1]) * scale,
            ]
        )
        area = _signed_area(font_pts)
        if (not is_hole and area > 0) or (is_hole and area < 0):
            font_pts = font_pts[::-1]

        min_x = min(min_x, float(font_pts[:, 0].min()))
        max_x = max(max_x, float(font_pts[:, 0].max()))
        paths.append(font_pts)

    pen = TTGlyphPen(None)
    if not paths or min_x == float("inf"):
        return pen.glyph(), side_bearing * 2

    shift_x = side_bearing - min_x
    for font_pts in paths:
        xs = font_pts[:, 0] + shift_x
        ys = font_pts[:, 1]
        pen.moveTo((int(round(xs[0])), int(round(ys[0]))))
        for x, y in zip(xs[1:], ys[1:]):
            pen.lineTo((int(round(float(x))), int(round(float(y)))))
        pen.closePath()

    glyph = pen.glyph()
    if glyph.numberOfContours == 1 and len(glyph.coordinates) <= 8:
        raise ValueError(
            "Glyph collapsed to a rectangle — handwriting ink was not detected."
        )

    from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates

    coords = GlyphCoordinates(list(glyph.coordinates))
    bounds = coords.calcBounds()
    if bounds is not None:
        _xMin, yMin, _xMax, yMax = bounds
        gh = yMax - yMin
        if gh > 1:
            s = target_units / float(gh)
            if abs(s - 1.0) > 0.02:
                coords.scale((s, s))
            # Reset left side bearing
            b2 = coords.calcBounds()
            if b2 is not None:
                coords.translate((side_bearing - b2[0], 0))
            coords.toInt()
            glyph.coordinates = coords
            b3 = coords.calcIntBounds()
            glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax = b3

    advance = int(getattr(glyph, "xMax", side_bearing * 4) + side_bearing)
    advance = max(advance, side_bearing * 2)
    advance = min(advance, 1800)
    return glyph, advance
