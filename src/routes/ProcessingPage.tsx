import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FloatingPages } from '../components/FloatingPages'
import { FontSpecimen } from '../components/FontSpecimen'
import { Logo } from '../components/Logo'
import { PrimaryButton } from '../components/PrimaryButton'
import { buildFontFromLive, isCurrentEngineFont } from '../lib/buildLiveFont'
import { mockProcess } from '../lib/mockProcess'
import { useSession, type CaptureSource } from '../state/sessionStore'
import './ProcessingPage.css'

type Phase = 'processing' | 'result' | 'error'

type ProcessingLocationState = {
  source?: CaptureSource
}

const ZOOM_EASE = [0.16, 1, 0.3, 1] as const
const MIN_PROCESSING_MS = 2800

function backPathForMode(mode: CaptureSource | null) {
  if (mode === 'live') return '/write/capture'
  if (mode === 'samples') return '/upload/samples'
  if (mode === 'structured') return '/upload/structured'
  return '/upload'
}

function retryPathForMode(mode: CaptureSource | null) {
  if (mode === 'live') return '/write'
  return '/upload'
}

export function ProcessingPage() {
  const {
    ready,
    photos,
    uploadMode,
    builtFont,
    resultReady,
    setUploadMode,
    setBuiltFont,
    setResultReady,
    clearUpload,
  } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [phase, setPhase] = useState<Phase>('processing')
  const [error, setError] = useState<string | null>(null)

  const navSource = (location.state as ProcessingLocationState | null)?.source
  const source: CaptureSource | null = navSource ?? uploadMode
  const hasSession = photos.length > 0 || Boolean(builtFont && resultReady)
  const uploadPreviewOnly = source === 'structured' || source === 'samples'

  useEffect(() => {
    if (navSource && navSource !== uploadMode && !uploadPreviewOnly) {
      setUploadMode(navSource)
    }
  }, [navSource, uploadMode, setUploadMode, uploadPreviewOnly])

  useEffect(() => {
    if (!ready || uploadPreviewOnly) return

    // Only reuse a cached font built by the current pipeline
    if (resultReady && isCurrentEngineFont(builtFont)) {
      setPhase('result')
      return
    }

    if (!photos.length || source !== 'live') return

    let cancelled = false

    ;(async () => {
      setPhase('processing')
      setError(null)

      try {
        const started = performance.now()
        const font = await buildFontFromLive(
          photos.map((p) => ({ id: p.id, file: p.file })),
        )
        const wait = MIN_PROCESSING_MS - (performance.now() - started)
        if (wait > 0) await mockProcess(wait)
        if (cancelled) {
          URL.revokeObjectURL(font.objectUrl)
          return
        }
        setBuiltFont(font)
        setResultReady(true)
        setPhase('result')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    ready,
    photos,
    source,
    resultReady,
    builtFont,
    setBuiltFont,
    setResultReady,
    uploadPreviewOnly,
  ])

  if (!ready) {
    return <main className="processing" />
  }

  // Photo upload can be explored, but processing isn’t wired yet
  if (uploadPreviewOnly) {
    return <Navigate to={backPathForMode(source)} replace />
  }

  if (!hasSession) {
    return <Navigate to={source === 'live' ? '/write' : '/upload'} replace />
  }

  const urls = photos.map((p) => p.previewUrl)
  const isResult = phase === 'result'
  const isLive = source === 'live'

  const leaveTo = (path: string, state?: object, wipe = false) => {
    navigate(path, state ? { state } : undefined)
    if (wipe) {
      queueMicrotask(() => clearUpload())
    }
  }

  return (
    <main
      className={`processing${isResult ? ' processing--result' : ''}${phase === 'error' ? ' processing--error' : ''}`}
    >
      <header className="processing__header">
        <button
          type="button"
          className="processing__back"
          onClick={() => {
            if (isResult || phase === 'error') {
              leaveTo(retryPathForMode(source), undefined, true)
              return
            }
            navigate(backPathForMode(source))
          }}
        >
          Back
        </button>
        <Logo placement="corner" />
      </header>

      <div className="processing__stage">
        <div className={`processing__viewport${isResult ? ' processing__viewport--result' : ''}`}>
          <AnimatePresence>
            {phase === 'processing' && (
              <motion.div
                key="orbit"
                className="processing__layer processing__layer--orbit"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  scale: 0.38,
                  opacity: 0,
                  filter: 'blur(6px)',
                }}
                transition={{ duration: 1.15, ease: ZOOM_EASE }}
              >
                <FloatingPages
                  urls={urls.length ? urls : []}
                  variant={isLive ? 'glyphs' : 'pages'}
                />
                <p className="processing__status" aria-live="polite">
                  Creating your font…
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 'error' && (
              <motion.div
                key="error"
                className="processing__layer processing__layer--error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <p className="processing__error-title">Couldn’t create your font</p>
                <p className="processing__error-detail">{error}</p>
                <div className="processing__actions">
                  <PrimaryButton
                    onClick={() => leaveTo(retryPathForMode(source), undefined, true)}
                  >
                    {isLive ? 'Try again' : 'Upload again'}
                  </PrimaryButton>
                  <PrimaryButton
                    variant="ghost"
                    onClick={() => leaveTo('/', { skipIntro: true })}
                  >
                    Back home
                  </PrimaryButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isResult && (
              <motion.div
                key="specimen"
                className="processing__layer processing__layer--specimen"
                initial={{ opacity: 0, scale: 1.72 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: ZOOM_EASE, delay: 0.12 }}
              >
                <FontSpecimen
                  fontUrl={builtFont?.objectUrl}
                  familyName={builtFont?.familyName}
                  fontBlob={builtFont?.blob}
                />

                <motion.div
                  className="processing__actions"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.45 }}
                >
                  <PrimaryButton onClick={() => leaveTo('/', { skipIntro: true })}>
                    Back home
                  </PrimaryButton>
                  <PrimaryButton
                    variant="ghost"
                    onClick={() => leaveTo(retryPathForMode(source), undefined, true)}
                  >
                    {isLive ? 'Write again' : 'Upload again'}
                  </PrimaryButton>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
