# Fontify

Fontify turns your handwriting into a downloadable custom typeface.

You capture your letters one of two ways: **Write live** (draw each character in the browser with a finger or stylus) or **Upload a photo** (photograph a structured alphabet page or everyday handwriting samples). Fontify then builds a font you can preview in a specimen, type into, and export as a `.ttf`.

**Write live** is fully wired end-to-end — glyphs go to a small Python API that vectorizes your ink and packs a TrueType font. **Photo upload** is browsable as a preview of the flow, but photo processing isn’t ready yet; use Write live to actually create a font.

## Run locally

```bash
npm install
npm run dev
```

In a second terminal (needed for Write live):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
npm run dev:api
```

- App: [http://localhost:5173](http://localhost:5173)
- API: [http://127.0.0.1:8000](http://127.0.0.1:8000) (`/api` is proxied by Vite)
