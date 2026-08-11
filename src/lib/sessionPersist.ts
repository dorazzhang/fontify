import type { Stroke } from '../components/WritingCanvas'

const DB_NAME = 'fontify-session'
const DB_VERSION = 1
const STORE = 'kv'

export type CaptureSource = 'structured' | 'samples' | 'live'

export type PersistedPhoto = {
  id: string
  name: string
  type: string
  previewDataUrl: string
  fileBuffer: ArrayBuffer
}

export type CaptureDraft = {
  index: number
  saved: Record<string, Stroke[]>
  previews: Record<string, string>
}

export type PersistedBuiltFont = {
  familyName: string
  glyphs: string[]
  skipped: string[]
  ttfBuffer: ArrayBuffer
  engineVersion: number
}

export type PersistedSession = {
  uploadMode: CaptureSource | null
  photos: PersistedPhoto[]
  captureDraft: CaptureDraft | null
  builtFont: PersistedBuiltFont | null
  resultReady: boolean
  /** Bump when font pipeline changes so stale TTFs are discarded */
  engineVersion?: number
}

/** Increment when generated fonts should be invalidated */
export const FONT_ENGINE_VERSION = 6

const EMPTY: PersistedSession = {
  uploadMode: null,
  photos: [],
  captureDraft: null,
  builtFont: null,
  resultReady: false,
  engineVersion: FONT_ENGINE_VERSION,
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'))
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB set failed'))
  })
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'))
  })
}

export async function loadPersistedSession(): Promise<PersistedSession> {
  try {
    const data = await idbGet<PersistedSession>('session')
    if (!data) return { ...EMPTY }

    const versionOk = data.engineVersion === FONT_ENGINE_VERSION
    const builtFont = versionOk ? (data.builtFont ?? null) : null
    const resultReady = versionOk && Boolean(data.resultReady) && Boolean(builtFont)

    return {
      uploadMode: data.uploadMode ?? null,
      photos: Array.isArray(data.photos) ? data.photos : [],
      captureDraft: data.captureDraft ?? null,
      builtFont,
      resultReady,
      engineVersion: FONT_ENGINE_VERSION,
    }
  } catch {
    return { ...EMPTY }
  }
}

export async function savePersistedSession(session: PersistedSession): Promise<void> {
  try {
    await idbSet('session', {
      ...session,
      engineVersion: FONT_ENGINE_VERSION,
    })
  } catch {
    // Persistence is best-effort (private mode / quota)
  }
}

export async function clearPersistedSession(): Promise<void> {
  try {
    await idbDel('session')
  } catch {
    // ignore
  }
}

export async function fileToPersistedPhoto(
  id: string,
  file: File,
  previewUrl: string,
): Promise<PersistedPhoto> {
  let previewDataUrl = previewUrl
  if (previewUrl.startsWith('blob:')) {
    previewDataUrl = await blobUrlToDataUrl(previewUrl)
  }
  const fileBuffer = await file.arrayBuffer()
  return {
    id,
    name: file.name || `${id}.png`,
    type: file.type || 'image/png',
    previewDataUrl,
    fileBuffer,
  }
}

export function persistedPhotoToSelected(photo: PersistedPhoto) {
  const file = new File([photo.fileBuffer], photo.name, { type: photo.type })
  return {
    id: photo.id,
    file,
    previewUrl: photo.previewDataUrl,
  }
}

async function blobUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer()
}
