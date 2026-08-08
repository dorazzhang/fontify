import { motion, useMotionValue, useMotionTemplate, animate } from 'framer-motion'
import { useEffect } from 'react'
import './Logo.css'

type LogoProps = {
  placement: 'hero' | 'corner'
  animateWrite?: boolean
  onWriteComplete?: () => void
}

/** Full left→right write duration (seconds) */
const WRITE_S = 3.8
/** Fill trails the stroke (ink catching up) */
const FILL_TRAIL_S = 0.12
/** Tiny beat after the write before zoom — keep snappy */
const HOLD_S = 0.04

const ZOOM_S = 0.78
const ZOOM_EASE = [0.16, 1, 0.3, 1] as const

function WritingLayer({
  className,
  delay = 0,
  progress,
}: {
  className: string
  delay?: number
  progress: ReturnType<typeof useMotionValue<number>>
}) {
  // Soft pen edge: solid ink behind the tip, short soft falloff ahead
  const mask = useMotionTemplate`linear-gradient(
    90deg,
    #000 0%,
    #000 max(0%, calc(${progress} * 100% - 4%)),
    transparent min(100%, calc(${progress} * 100% + 1%))
  )`

  return (
    <motion.span
      className={`logo__layer ${className}`}
      aria-hidden
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
      initial={{ opacity: delay > 0 ? 0 : 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay }}
    >
      fontify
    </motion.span>
  )
}

export function Logo({
  placement,
  animateWrite = false,
  onWriteComplete,
}: LogoProps) {
  const strokeProgress = useMotionValue(0)
  const fillProgress = useMotionValue(0)

  useEffect(() => {
    if (!animateWrite || placement !== 'hero') {
      strokeProgress.set(1)
      fillProgress.set(1)
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      strokeProgress.set(1)
      fillProgress.set(1)
      onWriteComplete?.()
      return
    }

    strokeProgress.set(0)
    fillProgress.set(0)

    const strokeAnim = animate(strokeProgress, 1, {
      duration: WRITE_S,
      ease: [0.4, 0.0, 0.2, 1],
    })

    const fillAnim = animate(fillProgress, 1, {
      duration: WRITE_S,
      ease: [0.4, 0.0, 0.2, 1],
      delay: FILL_TRAIL_S,
    })

    // Start zoom as soon as the write stroke finishes (don't wait on fill lag)
    const doneId = window.setTimeout(
      () => onWriteComplete?.(),
      (WRITE_S + HOLD_S) * 1000,
    )

    return () => {
      strokeAnim.stop()
      fillAnim.stop()
      window.clearTimeout(doneId)
    }
  }, [animateWrite, placement, onWriteComplete, strokeProgress, fillProgress])

  const writing = placement === 'hero' && animateWrite

  return (
    <motion.div
      className={`logo logo--${placement}`}
      layoutId="fontify-logo"
      transition={{ layout: { duration: ZOOM_S, ease: ZOOM_EASE } }}
    >
      <div className="logo__word" aria-label="fontify" role="img">
        {writing ? (
          <>
            <WritingLayer
              className="logo__layer--stroke"
              progress={strokeProgress}
            />
            <WritingLayer
              className="logo__layer--fill"
              progress={fillProgress}
              delay={FILL_TRAIL_S}
            />
            <span className="sr-only">fontify</span>
          </>
        ) : (
          <span className="logo__layer logo__layer--fill">fontify</span>
        )}

        {placement === 'corner' && (
          <motion.svg
            className="logo__underline"
            viewBox="0 0 260 24"
            preserveAspectRatio="none"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.55 }}
          >
            {/* Baseline flourish: sits under o-n-t-i, crosses f / f / y descenders */}
            <motion.path
              d="M2 12 C22 9.2, 40 14.2, 58 12 C78 9.6, 94 15.6, 114 12.4 C145 8.6, 178 15.4, 214 11 C230 9, 246 13, 258 11.2"
              fill="none"
              stroke="url(#logo-underline-ink)"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.75,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.58,
              }}
            />
            <defs>
              <linearGradient
                id="logo-underline-ink"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="var(--coral)" />
                <stop offset="100%" stopColor="var(--ink)" />
              </linearGradient>
            </defs>
          </motion.svg>
        )}
      </div>
    </motion.div>
  )
}
