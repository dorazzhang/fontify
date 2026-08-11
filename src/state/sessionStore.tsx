import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SelectedFile } from '../components/PhotoDropzone'
import type { BuiltFont } from '../lib/buildLiveFont'
import {
  clearPersistedSession,
  fileToPersistedPhoto,
  loadPersistedSession,
  persistedPhotoToSelected,
  savePersistedSession,
  type CaptureDraft,
  type CaptureSource,
  type PersistedBuiltFont,
} from '../lib/sessionPersist'

export type { CaptureSource, CaptureDraft }

type SessionSnapshot = {
  uploadMode: CaptureSource | null
  photos: SelectedFile[]
  captureDraft: CaptureDraft | null
  builtFont: BuiltFont | null
  resultReady: boolean
}

type SessionContextValue = {
  ready: boolean
  uploadMode: CaptureSource | null
  photos: SelectedFile[]
  captureDraft: CaptureDraft | null
  builtFont: BuiltFont | null
  resultReady: boolean
  setUploadMode: (mode: CaptureSource | null) => void
  setPhotos: (files: SelectedFile[]) => void
  setCaptureDraft: (draft: CaptureDraft | null) => void
  setBuiltFont: (font: BuiltFont | null) => void
  setResultReady: (ready: boolean) => void
  clearUpload: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function builtFromPersisted(p: PersistedBuiltFont): BuiltFont {
  const blob = new Blob([p.ttfBuffer], { type: 'font/ttf' })
  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    familyName: p.familyName,
    glyphs: p.glyphs,
    skipped: p.skipped,
    engineVersion: p.engineVersion ?? 0,
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [uploadMode, setUploadModeState] = useState<CaptureSource | null>(null)
  const [photos, setPhotosState] = useState<SelectedFile[]>([])
  const [captureDraft, setCaptureDraftState] = useState<CaptureDraft | null>(null)
  const [builtFont, setBuiltFontState] = useState<BuiltFont | null>(null)
  const [resultReady, setResultReadyState] = useState(false)

  const snapRef = useRef<SessionSnapshot>({
    uploadMode: null,
    photos: [],
    captureDraft: null,
    builtFont: null,
    resultReady: false,
  })
  const persistTimer = useRef<number | null>(null)

  const flushPersist = useCallback(() => {
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      const snap = snapRef.current
      void (async () => {
        const photosPersisted = await Promise.all(
          snap.photos.map((p) => fileToPersistedPhoto(p.id, p.file, p.previewUrl)),
        )
        let built: PersistedBuiltFont | null = null
        if (snap.builtFont) {
          built = {
            familyName: snap.builtFont.familyName,
            glyphs: snap.builtFont.glyphs,
            skipped: snap.builtFont.skipped,
            ttfBuffer: await snap.builtFont.blob.arrayBuffer(),
            engineVersion: snap.builtFont.engineVersion,
          }
        }
        await savePersistedSession({
          uploadMode: snap.uploadMode,
          photos: photosPersisted,
          captureDraft: snap.captureDraft,
          builtFont: built,
          resultReady: snap.resultReady,
        })
      })()
    }, 200)
  }, [])

  const patchSnap = useCallback(
    (partial: Partial<SessionSnapshot>) => {
      snapRef.current = { ...snapRef.current, ...partial }
      flushPersist()
    },
    [flushPersist],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await loadPersistedSession()
      if (cancelled) return
      const restoredPhotos = data.photos.map(persistedPhotoToSelected)
      const restoredFont = data.builtFont ? builtFromPersisted(data.builtFont) : null
      const restoredReady = data.resultReady && Boolean(restoredFont)

      setUploadModeState(data.uploadMode)
      setPhotosState(restoredPhotos)
      setCaptureDraftState(data.captureDraft)
      setBuiltFontState(restoredFont)
      setResultReadyState(restoredReady)
      snapRef.current = {
        uploadMode: data.uploadMode,
        photos: restoredPhotos,
        captureDraft: data.captureDraft,
        builtFont: restoredFont,
        resultReady: restoredReady,
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setUploadMode = useCallback(
    (mode: CaptureSource | null) => {
      setUploadModeState(mode)
      patchSnap({ uploadMode: mode })
    },
    [patchSnap],
  )

  const setPhotos = useCallback(
    (files: SelectedFile[]) => {
      setPhotosState((prev) => {
        const nextIds = new Set(files.map((f) => f.id))
        for (const p of prev) {
          if (!nextIds.has(p.id) && p.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(p.previewUrl)
          }
        }
        return files
      })
      patchSnap({ photos: files })
    },
    [patchSnap],
  )

  const setCaptureDraft = useCallback(
    (draft: CaptureDraft | null) => {
      setCaptureDraftState(draft)
      patchSnap({ captureDraft: draft })
    },
    [patchSnap],
  )

  const setBuiltFont = useCallback(
    (font: BuiltFont | null) => {
      setBuiltFontState((prev) => {
        if (prev && prev !== font) URL.revokeObjectURL(prev.objectUrl)
        return font
      })
      patchSnap({ builtFont: font })
    },
    [patchSnap],
  )

  const setResultReady = useCallback(
    (readyFlag: boolean) => {
      setResultReadyState(readyFlag)
      patchSnap({ resultReady: readyFlag })
    },
    [patchSnap],
  )

  const clearUpload = useCallback(() => {
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    setPhotosState((prev) => {
      for (const p of prev) {
        if (p.previewUrl.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl)
      }
      return []
    })
    setUploadModeState(null)
    setCaptureDraftState(null)
    setBuiltFontState((prev) => {
      if (prev) URL.revokeObjectURL(prev.objectUrl)
      return null
    })
    setResultReadyState(false)
    snapRef.current = {
      uploadMode: null,
      photos: [],
      captureDraft: null,
      builtFont: null,
      resultReady: false,
    }
    void clearPersistedSession()
  }, [])

  const value = useMemo(
    () => ({
      ready,
      uploadMode,
      photos,
      captureDraft,
      builtFont,
      resultReady,
      setUploadMode,
      setPhotos,
      setCaptureDraft,
      setBuiltFont,
      setResultReady,
      clearUpload,
    }),
    [
      ready,
      uploadMode,
      photos,
      captureDraft,
      builtFont,
      resultReady,
      setUploadMode,
      setPhotos,
      setCaptureDraft,
      setBuiltFont,
      setResultReady,
      clearUpload,
    ],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
