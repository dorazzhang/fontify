import { SENTENCE_STEP_ID } from './letters'
import { FONT_ENGINE_VERSION } from './sessionPersist'

export type BuiltFont = {
  blob: Blob
  objectUrl: string
  familyName: string
  glyphs: string[]
  skipped: string[]
  engineVersion: number
}

function apiBase() {
  return import.meta.env.VITE_API_BASE ?? '/api'
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

/** Build a TTF from live-capture PNG files (step ids as SelectedFile.id). */
export async function buildFontFromLive(
  items: { id: string; file: File }[],
  familyName = `Fontify Hand ${Date.now().toString(36)}`,
): Promise<BuiltFont> {
  const glyphs = items.filter((item) => item.id !== SENTENCE_STEP_ID)
  if (!glyphs.length) {
    throw new Error('No glyph images to send.')
  }

  const body = new FormData()
  body.append('family_name', familyName)
  body.append(
    'ids',
    JSON.stringify(glyphs.map((g) => g.id)),
  )
  for (const g of glyphs) {
    body.append('files', g.file, `${g.id}.png`)
  }

  const res = await fetch(`${apiBase()}/v1/fonts/from-live`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    let detail = `Font build failed (${res.status})`
    try {
      const data = (await res.json()) as { detail?: string }
      if (data.detail) detail = data.detail
    } catch {
      // keep status text
    }
    throw new Error(detail)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const glyphsHeader = res.headers.get('X-Fontify-Glyphs') ?? ''
  const skippedHeader = res.headers.get('X-Fontify-Skipped') ?? ''

  return {
    blob,
    objectUrl,
    familyName,
    glyphs: glyphsHeader ? glyphsHeader.split(',').filter(Boolean) : [],
    skipped: skippedHeader ? skippedHeader.split(',').filter(Boolean) : [],
    engineVersion: FONT_ENGINE_VERSION,
  }
}

export function isCurrentEngineFont(font: BuiltFont | null | undefined): boolean {
  return Boolean(font && font.engineVersion === FONT_ENGINE_VERSION)
}

export function revokeBuiltFont(font: BuiltFont | null | undefined) {
  if (font?.objectUrl) URL.revokeObjectURL(font.objectUrl)
}
