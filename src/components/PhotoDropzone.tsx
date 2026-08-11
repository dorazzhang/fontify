import { useCallback, useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './PhotoDropzone.css'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
const ACCEPTED_HINT = 'PNG, JPG, WEBP, or HEIC — you can add multiple photos'

const ACCEPTED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i
const ACCEPTED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

type SelectedFile = {
  id: string
  file: File
  previewUrl: string
}

type PhotoDropzoneProps = {
  files: SelectedFile[]
  onChange: (files: SelectedFile[]) => void
  hint?: string
}

type RejectReason =
  | 'pdf'
  | 'vector'
  | 'gif'
  | 'other-image'
  | 'unknown'

type FileNotice = {
  id: string
  tone: 'error' | 'hint'
  title: string
  detail: string
}

function extensionOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function isAcceptedFile(file: File) {
  if (ACCEPTED_MIME.has(file.type)) return true
  // Some cameras/OS pickers leave type empty for HEIC/JPEG
  if (!file.type && ACCEPTED_EXT.test(file.name)) return true
  return false
}

function rejectReason(file: File): RejectReason {
  const type = file.type.toLowerCase()
  const ext = extensionOf(file.name)

  if (type === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (type === 'image/svg+xml' || ext === 'svg') return 'vector'
  if (type === 'image/gif' || ext === 'gif') return 'gif'
  if (type.startsWith('image/') || /^(bmp|tiff?|avif|ico)$/.test(ext)) {
    return 'other-image'
  }
  return 'unknown'
}

function messageForReason(reason: RejectReason, names: string[]): FileNotice {
  const list =
    names.length === 1
      ? `“${names[0]}”`
      : `${names.length} files (${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''})`

  switch (reason) {
    case 'pdf':
      return {
        id: `pdf-${names.join('|')}`,
        tone: 'error',
        title: `${list} can’t be used as a photo`,
        detail:
          'Export or screenshot the page as PNG or JPG, or take a clear photo of the printed sheet.',
      }
    case 'vector':
      return {
        id: `vector-${names.join('|')}`,
        tone: 'error',
        title: `${list} is a vector file`,
        detail: 'Save or export as PNG or JPG so we can read your handwriting from a raster photo.',
      }
    case 'gif':
      return {
        id: `gif-${names.join('|')}`,
        tone: 'error',
        title: `${list} is a GIF`,
        detail: 'Use a still PNG or JPG export instead of an animated or GIF image.',
      }
    case 'other-image':
      return {
        id: `other-image-${names.join('|')}`,
        tone: 'error',
        title: `${list} isn’t a supported photo type`,
        detail: 'Convert to PNG, JPG, or WEBP (HEIC from iPhone Photos is fine too).',
      }
    default:
      return {
        id: `unknown-${names.join('|')}`,
        tone: 'error',
        title: `${list} isn’t a supported photo`,
        detail: 'Choose a PNG, JPG, WEBP, or HEIC image of your handwriting.',
      }
  }
}

function buildRejectNotices(rejected: File[]): FileNotice[] {
  const byReason = new Map<RejectReason, string[]>()
  for (const file of rejected) {
    const reason = rejectReason(file)
    const names = byReason.get(reason) ?? []
    names.push(file.name || 'untitled')
    byReason.set(reason, names)
  }
  return [...byReason.entries()].map(([reason, names]) =>
    messageForReason(reason, names),
  )
}

export type { SelectedFile }

export function PhotoDropzone({
  files,
  onChange,
  hint = ACCEPTED_HINT,
}: PhotoDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [notices, setNotices] = useState<FileNotice[]>([])
  const [brokenPreviews, setBrokenPreviews] = useState<Set<string>>(() => new Set())

  const dismissNotice = (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id))
  }

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const all = Array.from(list)
      if (!all.length) return

      const accepted = all.filter(isAcceptedFile)
      const rejected = all.filter((f) => !isAcceptedFile(f))
      const nextNotices = buildRejectNotices(rejected)

      if (rejected.length && !accepted.length) {
        setNotices(nextNotices)
        return
      }

      if (!accepted.length) return

      const next = [
        ...files,
        ...accepted.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]
      onChange(next)
      setNotices(nextNotices)
    },
    [files, onChange],
  )

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(files.filter((f) => f.id !== id))
    setBrokenPreviews((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const onPreviewError = (id: string, file: File) => {
    setBrokenPreviews((prev) => {
      if (prev.has(id)) return prev
      return new Set(prev).add(id)
    })

    const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)
    const notice: FileNotice = {
      id: `preview-${id}`,
      tone: 'hint',
      title: isHeic
        ? `Preview unavailable for “${file.name}”`
        : `Couldn’t preview “${file.name}”`,
      detail: isHeic
        ? 'The file is still attached. If upload fails later, convert it to JPG in Photos first.'
        : 'The file is still attached. If it looks wrong, re-export as PNG or JPG and try again.',
    }
    setNotices((prev) => {
      if (prev.some((n) => n.id === notice.id)) return prev
      return [...prev, notice]
    })
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  return (
    <div className="photo-drop">
      <label
        htmlFor={inputId}
        className={`photo-drop__zone${dragging ? ' photo-drop__zone--active' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (e.currentTarget.contains(e.relatedTarget as Node)) return
          setDragging(false)
        }}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="photo-drop__input"
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={onInputChange}
        />
        <span className="photo-drop__title">Drag photos here</span>
        <span className="photo-drop__sub">
          or <span className="photo-drop__browse">browse files</span>
        </span>
        <span className="photo-drop__hint">{hint}</span>
      </label>

      {notices.length > 0 && (
        <ul className="photo-drop__notices" aria-live="polite" aria-label="File messages">
          {notices.map((notice) => (
            <li
              key={notice.id}
              className={`photo-drop__notice photo-drop__notice--${notice.tone}`}
              role={notice.tone === 'error' ? 'alert' : 'status'}
            >
              <div className="photo-drop__notice-body">
                <strong className="photo-drop__notice-title">{notice.title}</strong>
                <span className="photo-drop__notice-detail">{notice.detail}</span>
              </div>
              <button
                type="button"
                className="photo-drop__notice-dismiss"
                onClick={() => dismissNotice(notice.id)}
                aria-label="Dismiss message"
              >
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="photo-drop__list" aria-label="Selected photos">
          {files.map((item) => (
            <li key={item.id} className="photo-drop__item">
              {brokenPreviews.has(item.id) ? (
                <div className="photo-drop__thumb photo-drop__thumb--broken" aria-hidden>
                  ?
                </div>
              ) : (
                <img
                  src={item.previewUrl}
                  alt=""
                  className="photo-drop__thumb"
                  onError={() => onPreviewError(item.id, item.file)}
                />
              )}
              <div className="photo-drop__meta">
                <span className="photo-drop__name" title={item.file.name}>
                  {item.file.name}
                </span>
                <span className="photo-drop__size">
                  {(item.file.size / 1024).toFixed(0)} KB
                  {brokenPreviews.has(item.id) ? ' · preview unavailable' : ''}
                </span>
              </div>
              <button
                type="button"
                className="photo-drop__remove"
                onClick={() => removeFile(item.id)}
                aria-label={`Remove ${item.file.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
