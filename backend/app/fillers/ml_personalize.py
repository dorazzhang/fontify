"""
Few-shot handwriting personalization for missing glyphs.

Pipeline:
1. Style  — encode the glyphs the user DID write into a style vector
2. Content — render each character in a plain reference font (structure only)
3. Train  — briefly overfit a tiny stylizer on (content → user's ink) pairs
4. Generate — run the stylizer on missing characters with the same style vector
5. Vectorize — existing contour → TTF path (unchanged)

Later we can swap TinyStylizer for DiffusionPen / DA-Font weights
without changing the font_builder API.
"""

from __future__ import annotations

import logging
from typing import Iterable

import cv2
import numpy as np

logger = logging.getLogger(__name__)

SIZE = 64


def render_content_glyph(ch: str, size: int = SIZE) -> np.ndarray:
    """Structure-only glyph from a system font (no handwriting style)."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(img)
    font = None
    for name in (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "Arial.ttf",
    ):
        try:
            font = ImageFont.truetype(name, size=int(size * 0.72))
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), ch, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), ch, fill=255, font=font)
    arr = np.asarray(img, dtype=np.uint8)
    if np.any(arr):
        arr = cv2.dilate(arr, np.ones((2, 2), np.uint8), iterations=1)
    return arr


def mask_to_square(mask: np.ndarray, size: int = SIZE) -> np.ndarray:
    """Crop ink and fit into a square canvas."""
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return np.zeros((size, size), np.uint8)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    pad = 4
    y0 = max(0, y0 - pad)
    x0 = max(0, x0 - pad)
    y1 = min(mask.shape[0] - 1, y1 + pad)
    x1 = min(mask.shape[1] - 1, x1 + pad)
    crop = mask[y0 : y1 + 1, x0 : x1 + 1]
    h, w = crop.shape
    scale = (size - 8) / max(h, w, 1)
    nh, nw = max(1, int(round(h * scale))), max(1, int(round(w * scale)))
    resized = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA)
    _, resized = cv2.threshold(resized, 40, 255, cv2.THRESH_BINARY)
    out = np.zeros((size, size), np.uint8)
    y = (size - nh) // 2
    x = (size - nw) // 2
    out[y : y + nh, x : x + nw] = resized
    return out


def _build_models():
    import torch
    import torch.nn as nn
    import torch.nn.functional as F

    class StyleEncoder(nn.Module):
        def __init__(self, dim: int = 128):
            super().__init__()
            self.net = nn.Sequential(
                nn.Conv2d(1, 32, 3, stride=2, padding=1),
                nn.ReLU(inplace=True),
                nn.Conv2d(32, 64, 3, stride=2, padding=1),
                nn.ReLU(inplace=True),
                nn.Conv2d(64, 128, 3, stride=2, padding=1),
                nn.ReLU(inplace=True),
                nn.AdaptiveAvgPool2d(1),
            )
            self.fc = nn.Linear(128, dim)

        def forward(self, x):
            h = self.net(x).flatten(1)
            return self.fc(h)

    class Stylizer(nn.Module):
        """Content image + style vector → handwriting-like mask."""

        def __init__(self, style_dim: int = 128):
            super().__init__()
            self.enc1 = nn.Sequential(
                nn.Conv2d(1, 32, 3, padding=1), nn.ReLU(inplace=True)
            )
            self.enc2 = nn.Sequential(
                nn.Conv2d(32, 64, 3, stride=2, padding=1), nn.ReLU(inplace=True)
            )
            self.enc3 = nn.Sequential(
                nn.Conv2d(64, 128, 3, stride=2, padding=1), nn.ReLU(inplace=True)
            )
            self.film = nn.Linear(style_dim, 128 * 2)
            self.up1 = nn.Sequential(
                nn.ConvTranspose2d(128, 64, 4, stride=2, padding=1),
                nn.ReLU(inplace=True),
            )
            self.up2 = nn.Sequential(
                nn.ConvTranspose2d(128, 32, 4, stride=2, padding=1),
                nn.ReLU(inplace=True),
            )
            self.out = nn.Conv2d(64, 1, 3, padding=1)

        def forward(self, content, style):
            e1 = self.enc1(content)
            e2 = self.enc2(e1)
            e3 = self.enc3(e2)
            gb, gs = self.film(style).chunk(2, dim=-1)
            gb = gb.unsqueeze(-1).unsqueeze(-1)
            gs = gs.unsqueeze(-1).unsqueeze(-1)
            h = e3 * (1 + gs) + gb
            u1 = self.up1(h)
            if u1.shape[-2:] != e2.shape[-2:]:
                u1 = F.interpolate(
                    u1, size=e2.shape[-2:], mode="bilinear", align_corners=False
                )
            u1 = torch.cat([u1, e2], dim=1)
            u2 = self.up2(u1)
            if u2.shape[-2:] != e1.shape[-2:]:
                u2 = F.interpolate(
                    u2, size=e1.shape[-2:], mode="bilinear", align_corners=False
                )
            u2 = torch.cat([u2, e1], dim=1)
            return torch.sigmoid(self.out(u2))

    return StyleEncoder(), Stylizer()


def fill_missing_with_ml(
    written: dict[str, np.ndarray],
    missing: Iterable[str],
    *,
    steps: int = 160,
    device: str | None = None,
) -> dict[str, np.ndarray]:
    """
    Personalize a tiny model on the writer's glyphs and synthesize missing ones.
    """
    missing_list = [ch for ch in missing if ch not in written and len(ch) == 1]
    if not missing_list or len(written) < 3:
        return {}

    try:
        import torch
        import torch.nn.functional as F
    except ImportError:
        logger.warning("PyTorch not installed; skipping ML glyph fill.")
        return {}

    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
    dev = torch.device(device)

    chars = list(written.keys())
    content_np = [render_content_glyph(ch) for ch in chars]
    target_np = [mask_to_square(written[ch]) for ch in chars]

    content = (
        torch.tensor(np.stack(content_np)[:, None, :, :], dtype=torch.float32, device=dev)
        / 255.0
    )
    target = (
        torch.tensor(np.stack(target_np)[:, None, :, :], dtype=torch.float32, device=dev)
        / 255.0
    )

    style_enc, stylizer = _build_models()
    style_enc.to(dev)
    stylizer.to(dev)
    opt = torch.optim.Adam(
        list(style_enc.parameters()) + list(stylizer.parameters()),
        lr=2e-3,
    )

    n = content.shape[0]
    style_enc.train()
    stylizer.train()

    for _step in range(steps):
        idx = torch.randint(0, n, (min(8, n),), device=dev)
        ref_idx = torch.randint(0, n, (min(5, n),), device=dev)
        style = style_enc(target[ref_idx]).mean(dim=0, keepdim=True)
        style = style.expand(idx.shape[0], -1)
        pred = stylizer(content[idx], style)
        loss = F.binary_cross_entropy(pred, target[idx]) + 0.02 * pred.mean()
        opt.zero_grad(set_to_none=True)
        loss.backward()
        opt.step()

    style_enc.eval()
    stylizer.eval()
    out: dict[str, np.ndarray] = {}
    with torch.no_grad():
        style = style_enc(target).mean(dim=0, keepdim=True)
        for ch in missing_list:
            c = render_content_glyph(ch)
            ct = torch.tensor(c[None, None], dtype=torch.float32, device=dev) / 255.0
            pred = stylizer(ct, style)[0, 0].clamp(0, 1).cpu().numpy()
            ink = (pred * 255).astype(np.uint8)
            _, ink = cv2.threshold(ink, 70, 255, cv2.THRESH_BINARY)
            # If still faint, keep soft top-k pixels
            if np.count_nonzero(ink) < 20:
                flat = pred.reshape(-1)
                k = max(80, int(0.08 * flat.size))
                thresh = np.partition(flat, -k)[-k]
                ink = np.where(pred >= max(float(thresh), 0.25), 255, 0).astype(np.uint8)
            ink = cv2.morphologyEx(
                ink, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8), iterations=1
            )
            if np.count_nonzero(ink) < 16:
                continue
            canvas = np.zeros((300, 360), np.uint8)
            sq = mask_to_square(ink, size=200)
            top = int(0.74 * 300) - sq.shape[0] + 20
            left = (360 - sq.shape[1]) // 2
            top = int(np.clip(top, 0, 300 - sq.shape[0]))
            left = int(np.clip(left, 0, 360 - sq.shape[1]))
            canvas[top : top + sq.shape[0], left : left + sq.shape[1]] = sq
            out[ch] = canvas

    logger.info(
        "ML filler generated %d/%d missing glyphs (steps=%d, device=%s)",
        len(out),
        len(missing_list),
        steps,
        device,
    )
    return out


def try_case_transfer(
    written: dict[str, np.ndarray],
    missing: Iterable[str],
) -> dict[str, np.ndarray]:
    """Derive missing case from its pair using the writer's real ink."""
    out: dict[str, np.ndarray] = {}
    for ch in missing:
        if ch in written:
            continue
        if ch.islower() and ch.upper() in written:
            out[ch] = _rescale_mask(written[ch.upper()], y_scale=0.72)
        elif ch.isupper() and ch.lower() in written:
            out[ch] = _rescale_mask(written[ch.lower()], y_scale=1.28)
    return out


def _rescale_mask(mask: np.ndarray, y_scale: float) -> np.ndarray:
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return mask.copy()
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    crop = mask[y0 : y1 + 1, x0 : x1 + 1]
    nh = max(1, int(round(crop.shape[0] * y_scale)))
    nw = max(1, int(round(crop.shape[1] * (0.9 + 0.1 * y_scale))))
    resized = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA)
    _, resized = cv2.threshold(resized, 40, 255, cv2.THRESH_BINARY)
    out = np.zeros_like(mask)
    top = min(max(0, y1 - nh), out.shape[0] - nh)
    left = min(max(0, (x0 + x1 - nw) // 2), out.shape[1] - nw)
    out[top : top + nh, left : left + nw] = resized
    return out
