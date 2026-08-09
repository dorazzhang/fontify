import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FloatingPages } from '../components/FloatingPages'
import { FontSpecimen } from '../components/FontSpecimen'
import { Logo } from '../components/Logo'
import { PrimaryButton } from '../components/PrimaryButton'
import { mockProcess } from '../lib/mockProcess'
import { useSession, type CaptureSource } from '../state/sessionStore'
import './ProcessingPage.css'

type Phase = 'processing' | 'result'

type ProcessingLocationState = {
  source?: CaptureSource
}

const ZOOM_EASE = [0.16, 1, 0.3, 1] as const

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
  const { photos, uploadMode, setUploadMode, clearUpload } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [phase, setPhase] = useState<Phase>('processing')
  // Only auto-redirect if we landed here with no photos — not when clearing to leave
  const landedEmpty = useRef(photos.length === 0)

  const navSource = (location.state as ProcessingLocationState | null)?.source
  const source: CaptureSource | null = navSource ?? uploadMode

  useEffect(() => {
    if (navSource && navSource !== uploadMode) {
      setUploadMode(navSource)
    }
  }, [navSource, uploadMode, setUploadMode])

  useEffect(() => {
    if (!photos.length) return
    let cancelled = false
    ;(async () => {
      await mockProcess(3400)
      if (!cancelled) setPhase('result')
    })()
    return () => {
      cancelled = true
    }
  }, [photos.length])

  if (landedEmpty.current && !photos.length) {
    return <Navigate to={source === 'live' ? '/write' : '/upload'} replace />
  }

  if (!photos.length) {
    return null
  }

  const urls = photos.map((p) => p.previewUrl)
  const isResult = phase === 'result'
  const isLive = source === 'live'

  const leaveTo = (path: string, state?: object) => {
    navigate(path, state ? { state } : undefined)
    // Clear after navigation so empty photos don’t hijack this page
    queueMicrotask(() => clearUpload())
  }

  return (
    <main className={`processing${isResult ? ' processing--result' : ''}`}>
      <header className="processing__header">
        <button
          type="button"
          className="processing__back"
          onClick={() => {
            if (isResult) {
              leaveTo(retryPathForMode(source))
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
        <div className="processing__viewport">
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
                <FloatingPages urls={urls} variant={isLive ? 'glyphs' : 'pages'} />
                <p className="processing__status">Creating your font…</p>
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
                <FontSpecimen />

                <motion.div
                  className="processing__actions"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.45 }}
                >
                  <PrimaryButton
                    onClick={() => leaveTo('/', { skipIntro: true })}
                  >
                    Back home
                  </PrimaryButton>
                  <PrimaryButton
                    variant="ghost"
                    onClick={() => leaveTo(retryPathForMode(source))}
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
