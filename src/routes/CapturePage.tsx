import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { PrimaryButton } from '../components/PrimaryButton'
import {
  WritingCanvas,
  type Stroke,
  type WritingCanvasHandle,
} from '../components/WritingCanvas'
import { WritingGuides } from '../components/WritingGuides'
import { buildCaptureSteps } from '../lib/letters'
import { dataUrlToFile } from '../lib/buildLiveFont'
import { useSession } from '../state/sessionStore'
import type { SelectedFile } from '../components/PhotoDropzone'
import './CapturePage.css'

export function CapturePage() {
  const steps = useMemo(() => buildCaptureSteps(), [])
  const {
    ready,
    captureDraft,
    setCaptureDraft,
    setPhotos,
    setUploadMode,
    setBuiltFont,
    setResultReady,
  } = useSession()

  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState<Record<string, Stroke[]>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [hydrated, setHydrated] = useState(false)
  const [emptyHint, setEmptyHint] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const canvasRef = useRef<WritingCanvasHandle>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!ready || hydrated) return
    if (captureDraft) {
      setIndex(
        Math.min(Math.max(captureDraft.index, 0), Math.max(steps.length - 1, 0)),
      )
      setSaved(captureDraft.saved ?? {})
      setPreviews(captureDraft.previews ?? {})
    }
    setHydrated(true)
  }, [ready, hydrated, captureDraft, steps.length])

  const step = steps[index]
  const progress = ((index + 1) / steps.length) * 100
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  useEffect(() => {
    if (!hydrated) return
    canvasRef.current?.loadStrokes(saved[step.id] ?? [])
    setEmptyHint(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, hydrated])

  const persistDraft = (
    nextIndex: number,
    nextSaved: Record<string, Stroke[]>,
    nextPreviews: Record<string, string>,
  ) => {
    setCaptureDraft({
      index: nextIndex,
      saved: nextSaved,
      previews: nextPreviews,
    })
  }

  const persistCurrent = () => {
    const strokes = canvasRef.current?.getStrokes() ?? []
    const hasInk = canvasRef.current?.hasInk() ?? false
    const preview = hasInk ? (canvasRef.current?.toDataURL() ?? '') : ''
    const nextSaved = { ...saved, [step.id]: strokes }
    const nextPreviews = { ...previews, [step.id]: preview }
    setSaved(nextSaved)
    setPreviews(nextPreviews)
    persistDraft(index, nextSaved, nextPreviews)
    return { strokes, preview, hasInk, nextSaved, nextPreviews }
  }

  const requireInk = () => {
    if (canvasRef.current?.hasInk()) {
      setEmptyHint(false)
      return true
    }
    setEmptyHint(true)
    return false
  }

  const finish = async () => {
    if (!requireInk() || finishing) return
    setFinishing(true)
    try {
      const { preview: currentPreview, nextPreviews } = persistCurrent()
      const merged = { ...nextPreviews, [step.id]: currentPreview }
      const files: SelectedFile[] = []
      for (const s of steps) {
        const url = merged[s.id]
        if (!url) continue
        const file = await dataUrlToFile(url, `${s.id}.png`)
        files.push({
          id: s.id,
          file,
          previewUrl: url,
        })
      }

      // New font run — clear previous result
      setBuiltFont(null)
      setResultReady(false)
      setUploadMode('live')
      setPhotos(files)
      navigate('/processing', { state: { source: 'live' } })
    } finally {
      setFinishing(false)
    }
  }

  const goNext = () => {
    if (!requireInk()) return
    if (isLast) {
      void finish()
      return
    }
    const { nextSaved, nextPreviews } = persistCurrent()
    const nextIndex = index + 1
    setIndex(nextIndex)
    persistDraft(nextIndex, nextSaved, nextPreviews)
  }

  const goBack = () => {
    setEmptyHint(false)
    const { nextSaved, nextPreviews } = persistCurrent()
    if (isFirst) {
      navigate('/write')
      return
    }
    const nextIndex = index - 1
    setIndex(nextIndex)
    persistDraft(nextIndex, nextSaved, nextPreviews)
  }

  if (!ready || !hydrated) {
    return <main className="capture" />
  }

  return (
    <main className="capture">
      <header className="capture__header">
        <button type="button" className="capture__back-link" onClick={goBack}>
          Back
        </button>
        <div className="capture__progress" aria-label="Capture progress">
          <div className="capture__progress-track">
            <div className="capture__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="capture__progress-label">
            {index + 1} / {steps.length}
          </p>
        </div>
        <Logo placement="corner" />
      </header>

      <section className="capture__body">
        <div className="capture__prompt">
          {step.kind === 'glyph' ? (
            <>
              <p className="capture__eyebrow">Draw this character</p>
              <p
                className={`capture__glyph${step.label === '0' ? ' capture__glyph--zero' : ''}`}
                aria-live="polite"
                aria-label={step.label === '0' ? 'zero' : step.label}
              >
                {step.label}
              </p>
            </>
          ) : (
            <>
              <p className="capture__eyebrow">Write this sentence</p>
              <p className="capture__sentence" aria-live="polite">
                {step.label}
              </p>
            </>
          )}
        </div>

        <div
          className={`capture__pad${step.kind === 'sentence' ? ' capture__pad--wide' : ''}${emptyHint ? ' capture__pad--warn' : ''}`}
        >
          <WritingGuides wide={step.kind === 'sentence'} />
          <WritingCanvas
            ref={canvasRef}
            onStrokeStart={() => setEmptyHint(false)}
          />
        </div>

        <div className="capture__hint-slot" aria-live="polite">
          <AnimatePresence>
            {emptyHint && (
              <motion.p
                className="capture__hint"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22 }}
              >
                No writing detected — please write before continuing.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="capture__controls">
          <PrimaryButton
            variant="ghost"
            onClick={() => {
              canvasRef.current?.clear()
              setEmptyHint(false)
              const nextSaved = { ...saved, [step.id]: [] }
              const nextPreviews = { ...previews, [step.id]: '' }
              setSaved(nextSaved)
              setPreviews(nextPreviews)
              persistDraft(index, nextSaved, nextPreviews)
            }}
          >
            Reset
          </PrimaryButton>
          <PrimaryButton variant="ghost" onClick={goBack}>
            Back
          </PrimaryButton>
          <PrimaryButton onClick={goNext} disabled={finishing}>
            {isLast ? (finishing ? 'Preparing…' : 'Finish') : 'Next'}
          </PrimaryButton>
        </div>
      </section>
    </main>
  )
}
