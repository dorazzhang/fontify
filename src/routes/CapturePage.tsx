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
import { useSession } from '../state/sessionStore'
import type { SelectedFile } from '../components/PhotoDropzone'
import './CapturePage.css'

export function CapturePage() {
  const steps = useMemo(() => buildCaptureSteps(), [])
  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState<Record<string, Stroke[]>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [emptyHint, setEmptyHint] = useState(false)
  const canvasRef = useRef<WritingCanvasHandle>(null)
  const navigate = useNavigate()
  const { setPhotos, setUploadMode } = useSession()

  const step = steps[index]
  const progress = ((index + 1) / steps.length) * 100
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  useEffect(() => {
    canvasRef.current?.loadStrokes(saved[step.id] ?? [])
    setEmptyHint(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id])

  const persistCurrent = () => {
    const strokes = canvasRef.current?.getStrokes() ?? []
    const hasInk = canvasRef.current?.hasInk() ?? false
    const preview = hasInk ? (canvasRef.current?.toDataURL() ?? '') : ''
    setSaved((prev) => ({ ...prev, [step.id]: strokes }))
    setPreviews((prev) => ({ ...prev, [step.id]: preview }))
    return { strokes, preview, hasInk }
  }

  const requireInk = () => {
    if (canvasRef.current?.hasInk()) {
      setEmptyHint(false)
      return true
    }
    setEmptyHint(true)
    return false
  }

  const finish = () => {
    if (!requireInk()) return
    const { preview: currentPreview } = persistCurrent()
    const merged = { ...previews, [step.id]: currentPreview }
    const files: SelectedFile[] = steps
      .map((s) => {
        const url = merged[s.id]
        if (!url) return null
        return {
          id: s.id,
          file: new File([], `${s.id}.png`, { type: 'image/png' }),
          previewUrl: url,
        } satisfies SelectedFile
      })
      .filter((f): f is SelectedFile => f != null)

    setUploadMode('live')
    setPhotos(files)
    navigate('/processing', { state: { source: 'live' } })
  }

  const goNext = () => {
    if (!requireInk()) return
    if (isLast) {
      finish()
      return
    }
    persistCurrent()
    setIndex((i) => i + 1)
  }

  const goBack = () => {
    setEmptyHint(false)
    persistCurrent()
    if (isFirst) {
      navigate('/write')
      return
    }
    setIndex((i) => i - 1)
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
            }}
          >
            Reset
          </PrimaryButton>
          <PrimaryButton variant="ghost" onClick={goBack}>
            Back
          </PrimaryButton>
          <PrimaryButton onClick={goNext}>{isLast ? 'Finish' : 'Next'}</PrimaryButton>
        </div>
      </section>
    </main>
  )
}
