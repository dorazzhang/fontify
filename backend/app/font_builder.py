"""Assemble labeled glyph images into a TrueType font."""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

from .normalize import SIDE_BEARING, compute_corpus_metrics
from .preprocess import ASCENDER, BASELINE_FROM_TOP, DESCENDER, UPM, ink_bbox, load_ink_mask
from .vectorize import mask_to_glyph


@dataclass
class GlyphInput:
    character: str
    png_bytes: bytes


@dataclass
class BuildResult:
    ttf_bytes: bytes
    glyphs: list[str]
    skipped: list[str]
    synthesized: list[str]
    fill_method: str


def _empty_glyph():
    return TTGlyphPen(None).glyph()


def _glyph_name(ch: str) -> str:
    if ch == ".notdef":
        return ".notdef"
    return f"uni{ord(ch):04X}"


def build_ttf(
    glyphs: list[GlyphInput],
    *,
    family_name: str = "Fontify Hand",
    style_name: str = "Regular",
) -> BuildResult:
    """
    Build a TTF from glyphs the user actually drew.

    No ML / skeleton fill — missing characters simply aren't in the font.
    """
    masks: dict[str, np.ndarray] = {}
    skipped: list[str] = []

    for g in glyphs:
        if len(g.character) != 1:
            skipped.append(g.character)
            continue
        mask = load_ink_mask(g.png_bytes)
        if ink_bbox(mask) is None:
            skipped.append(g.character)
            continue
        masks[g.character] = mask

    if not masks:
        raise ValueError("No ink detected in any glyph image.")

    metrics = compute_corpus_metrics(masks, baseline_from_top=BASELINE_FROM_TOP)

    chars = sorted(masks.keys(), key=lambda c: (ord(c), c))
    glyph_order = [".notdef", "space"] + [_glyph_name(c) for c in chars if c != " "]
    cmap = {ord(c): _glyph_name(c) for c in chars if c != " "}
    cmap[ord(" ")] = "space"

    glyf = {".notdef": _empty_glyph(), "space": _empty_glyph()}
    space_adv = max(int(round(metrics.px_to_unit * 28)), SIDE_BEARING * 3)
    metrics_htbl: dict[str, tuple[int, int]] = {
        ".notdef": (space_adv, 0),
        "space": (space_adv, 0),
    }

    for ch in chars:
        if ch == " ":
            continue
        glyph, advance = mask_to_glyph(
            masks[ch],
            metrics,
            character=ch,
        )
        name = _glyph_name(ch)
        glyf[name] = glyph
        metrics_htbl[name] = (advance, 0)

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(metrics_htbl)
    fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER)
    fb.setupHead(unitsPerEm=UPM)
    fb.setupMaxp()
    fb.setupPost()
    fb.setupNameTable(
        {
            "familyName": family_name,
            "styleName": style_name,
            "uniqueFontIdentifier": f"{family_name}-{style_name}",
            "fullName": f"{family_name} {style_name}",
            "psName": family_name.replace(" ", "") + "-" + style_name,
            "version": "Version 0.1",
        }
    )
    fb.setupOS2(
        sTypoAscender=ASCENDER,
        sTypoDescender=DESCENDER,
        sTypoLineGap=0,
        usWinAscent=ASCENDER,
        usWinDescent=abs(DESCENDER),
        achVendID="FNTF",
    )

    buf = io.BytesIO()
    fb.font.save(buf)
    return BuildResult(
        ttf_bytes=buf.getvalue(),
        glyphs=[c for c in chars if c != " "],
        skipped=skipped,
        synthesized=[],
        fill_method="written-only",
    )
