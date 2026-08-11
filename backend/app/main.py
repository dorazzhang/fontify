"""Fontify API — live-write glyph images → TTF."""

from __future__ import annotations

import json
import os
import re
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .font_builder import GlyphInput, build_ttf

app = FastAPI(title="Fontify", version="0.1.0")

_DEFAULT_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
]


def _cors_origins() -> list[str]:
    extra = os.environ.get("CORS_ORIGINS", "")
    from_env = [o.strip().rstrip("/") for o in extra.split(",") if o.strip()]
    # de-dupe, preserve order
    seen: set[str] = set()
    out: list[str] = []
    for origin in [*_DEFAULT_ORIGINS, *from_env]:
        if origin not in seen:
            seen.add(origin)
            out.append(origin)
    return out


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Fontify-Glyphs",
        "X-Fontify-Skipped",
        "X-Fontify-Synthesized",
        "X-Fontify-Fill",
        "Content-Disposition",
    ],
)

# letter-A, digit-0, symbol-!, punct-., or bare "A"
_ID_RE = re.compile(
    r"^(?:letter-|digit-|symbol-|punct-)?(?P<char>.)$",
)


def character_from_field(raw: str) -> str | None:
    raw = raw.strip()
    if len(raw) == 1:
        return raw
    m = _ID_RE.match(raw)
    if m:
        return m.group("char")
    # filenames like A.png
    stem = raw.rsplit("/", 1)[-1]
    if stem.lower().endswith(".png"):
        stem = stem[:-4]
    if len(stem) == 1:
        return stem
    m = _ID_RE.match(stem)
    return m.group("char") if m else None


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/v1/fonts/from-live")
async def font_from_live(
    files: Annotated[list[UploadFile], File(description="Glyph PNG uploads")],
    ids: Annotated[
        str | None,
        Form(description='JSON string array of step ids, same order as files'),
    ] = None,
    family_name: Annotated[str, Form()] = "Fontify Hand",
):
    """
    Build a TTF from labeled live-canvas PNGs.

    Send multipart fields:
      - files: one PNG per glyph
      - ids: JSON array of step ids (letter-A, digit-0, …) aligned with files
    """
    if not files:
        raise HTTPException(status_code=400, detail="No glyph files uploaded.")

    id_list: list[str] = []
    if ids:
        try:
            parsed = json.loads(ids)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="ids must be a JSON array.") from exc
        if not isinstance(parsed, list) or not all(isinstance(x, str) for x in parsed):
            raise HTTPException(status_code=400, detail="ids must be a JSON array of strings.")
        id_list = parsed

    if id_list and len(id_list) != len(files):
        raise HTTPException(
            status_code=400,
            detail=f"ids length ({len(id_list)}) must match files ({len(files)}).",
        )

    glyphs: list[GlyphInput] = []
    for i, upload in enumerate(files):
        raw_id = id_list[i] if id_list else (upload.filename or "")
        if raw_id == "pangram":
            continue
        ch = character_from_field(raw_id)
        if ch is None:
            raise HTTPException(
                status_code=400,
                detail=f"Could not parse character from id/filename: {raw_id!r}",
            )
        data = await upload.read()
        if not data:
            raise HTTPException(status_code=400, detail=f"Empty file for {raw_id!r}")
        glyphs.append(GlyphInput(character=ch, png_bytes=data))

    if not glyphs:
        raise HTTPException(status_code=400, detail="No usable glyph images.")

    try:
        result = build_ttf(glyphs, family_name=family_name.strip() or "Fontify Hand")
    except Exception as exc:  # noqa: BLE001 — surface builder failures
        raise HTTPException(status_code=500, detail=f"Font build failed: {exc}") from exc

    if not result.glyphs:
        raise HTTPException(
            status_code=400,
            detail="No ink detected in any glyph image.",
        )

    headers = {
        "X-Fontify-Glyphs": ",".join(result.glyphs),
        "X-Fontify-Skipped": ",".join(result.skipped),
        "X-Fontify-Synthesized": ",".join(result.synthesized),
        "X-Fontify-Fill": result.fill_method,
        "Content-Disposition": 'attachment; filename="fontify-hand.ttf"',
    }
    return Response(
        content=result.ttf_bytes,
        media_type="font/ttf",
        headers=headers,
    )
