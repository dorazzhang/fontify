import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SelectedFile } from '../components/PhotoDropzone'

export type UploadMode = 'structured' | 'samples'

type SessionContextValue = {
  uploadMode: UploadMode | null
  photos: SelectedFile[]
  setUploadMode: (mode: UploadMode | null) => void
  setPhotos: (files: SelectedFile[]) => void
  clearUpload: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [uploadMode, setUploadMode] = useState<UploadMode | null>(null)
  const [photos, setPhotosState] = useState<SelectedFile[]>([])

  const setPhotos = useCallback((files: SelectedFile[]) => {
    setPhotosState((prev) => {
      const nextIds = new Set(files.map((f) => f.id))
      for (const p of prev) {
        if (!nextIds.has(p.id)) URL.revokeObjectURL(p.previewUrl)
      }
      return files
    })
  }, [])

  const clearUpload = useCallback(() => {
    setPhotosState((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl)
      return []
    })
    setUploadMode(null)
  }, [])

  const value = useMemo(
    () => ({
      uploadMode,
      photos,
      setUploadMode,
      setPhotos,
      clearUpload,
    }),
    [uploadMode, photos, setPhotos, clearUpload],
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
