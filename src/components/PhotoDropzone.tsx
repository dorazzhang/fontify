import { useCallback, useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './PhotoDropzone.css'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

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

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
}

export type { SelectedFile }

export function PhotoDropzone({
  files,
  onChange,
  hint = 'PNG, JPG, or WEBP — you can add multiple photos',
}: PhotoDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list).filter(isImageFile)
      if (!incoming.length) return

      const next = [
        ...files,
        ...incoming.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]
      onChange(next)
    },
    [files, onChange],
  )

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(files.filter((f) => f.id !== id))
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

      {files.length > 0 && (
        <ul className="photo-drop__list" aria-label="Selected photos">
          {files.map((item) => (
            <li key={item.id} className="photo-drop__item">
              <img src={item.previewUrl} alt="" className="photo-drop__thumb" />
              <div className="photo-drop__meta">
                <span className="photo-drop__name" title={item.file.name}>
                  {item.file.name}
                </span>
                <span className="photo-drop__size">
                  {(item.file.size / 1024).toFixed(0)} KB
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
