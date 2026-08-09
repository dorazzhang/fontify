import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { ChooseMode } from '../components/ChooseMode'
import './HomePage.css'

type Stage = 'writing' | 'choose'

type HomeLocationState = {
  skipIntro?: boolean
}

export function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()

  // Capture once — browser keeps history.state across reload, which would
  // otherwise permanently skip the intro after “back home”.
  const [skipIntro] = useState(() =>
    Boolean((location.state as HomeLocationState | null)?.skipIntro),
  )

  const [stage, setStage] = useState<Stage>(skipIntro ? 'choose' : 'writing')
  const finished = useRef(skipIntro)

  useEffect(() => {
    if (!skipIntro) return
    navigate(location.pathname, { replace: true, state: null })
  }, [skipIntro, navigate, location.pathname])

  const handleWriteComplete = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setStage('choose')
  }, [])

  const showCorner = stage === 'choose'

  return (
    <main className={`home home--${stage}`}>
      <div className="home__ambient" aria-hidden="true">
        <motion.span
          className="home__orb home__orb--a"
          animate={{ x: [0, 18, -8, 0], y: [0, -14, 10, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="home__orb home__orb--b"
          animate={{ x: [0, -22, 12, 0], y: [0, 16, -10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <LayoutGroup>
        <header
          className={`home__logo-slot${showCorner ? ' home__logo-slot--corner' : ' home__logo-slot--hero'}`}
        >
          <Logo
            placement={showCorner ? 'corner' : 'hero'}
            animateWrite={!showCorner}
            onWriteComplete={!showCorner ? handleWriteComplete : undefined}
            linkHome={showCorner}
          />
        </header>

        <AnimatePresence>
          {showCorner && (
            <motion.section
              className="home__choose"
              key="choose"
              initial={skipIntro ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                skipIntro
                  ? { duration: 0 }
                  : { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.05 }
              }
            >
              <ChooseMode />
            </motion.section>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </main>
  )
}
