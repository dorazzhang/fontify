import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, useNavigate } from 'react-router-dom'
import { FloatingPages } from '../components/FloatingPages'
import { FontSpecimen } from '../components/FontSpecimen'
import { Logo } from '../components/Logo'
import { PrimaryButton } from '../components/PrimaryButton'
import { mockProcess } from '../lib/mockProcess'
import { useSession } from '../state/sessionStore'
import './ProcessingPage.css'

type Phase = 'processing' | 'result'

const ZOOM_EASE = [0.16, 1, 0.3, 1] as const

export function ProcessingPage() {
  const { photos, uploadMode, clearUpload } = useSession()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('processing')

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

  if (!photos.length) {
    return <Navigate to="/upload" replace />
  }

  const urls = photos.map((p) => p.previewUrl)
  const isResult = phase === 'result'

  return (
    <main className={`processing${isResult ? ' processing--result' : ''}`}>
      <header className="processing__header">
        <button
          type="button"
          className="processing__back"
          onClick={() => {
            if (isResult) {
              clearUpload()
              navigate('/upload')
              return
            }
            navigate(uploadMode === 'samples' ? '/upload/samples' : '/upload/structured')
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
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  scale: 0.38,
                  opacity: 0,
                  filter: 'blur(6px)',
                }}
                transition={{ duration: 1.15, ease: ZOOM_EASE }}
              >
                <FloatingPages urls={urls} />
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
                    onClick={() => {
                      clearUpload()
                      navigate('/', { state: { skipIntro: true } })
                    }}
                  >
                    Back home
                  </PrimaryButton>
                  <PrimaryButton
                    variant="ghost"
                    onClick={() => {
                      clearUpload()
                      navigate('/upload')
                    }}
                  >
                    Upload again
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
