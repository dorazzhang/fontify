import { useMemo } from 'react'
import { motion } from 'framer-motion'
import './FloatingPages.css'

type FloatingPagesProps = {
  urls: string[]
  variant?: 'glyphs' | 'pages'
}

const MAX_ITEMS = 18

function sampleUrls(urls: string[], max: number) {
  if (urls.length <= max) return urls
  const picked: string[] = []
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * (urls.length - 1)) / (max - 1))
    picked.push(urls[idx])
  }
  return picked
}

function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

type Particle = {
  url: string
  left: number
  top: number
  rotate: number
  duration: number
  delay: number
  pathX: number[]
  pathY: number[]
  pathR: number[]
}

function buildParticles(urls: string[]): Particle[] {
  const items = sampleUrls(urls, MAX_ITEMS)
  return items.map((url, i) => {
    const s = i + 1
    const left = 10 + rand(s * 2) * 80
    const top = 12 + rand(s * 3) * 72
    const rotate = (rand(s * 5) - 0.5) * 28
    const duration = 10 + rand(s * 7) * 8
    const delay = rand(s * 11) * 0.4 + i * 0.05

    const ampX = 48 + rand(s * 13) * 100
    const ampY = 36 + rand(s * 17) * 80
    const dirX = rand(s * 19) > 0.5 ? 1 : -1
    const dirY = rand(s * 23) > 0.5 ? 1 : -1

    return {
      url,
      left,
      top,
      rotate,
      duration,
      delay,
      pathX: [0, dirX * ampX, dirX * -ampX * 0.65, dirX * ampX * 0.4, 0],
      pathY: [0, dirY * ampY * 0.75, dirY * -ampY, dirY * ampY * 0.45, 0],
      pathR: [rotate, rotate + dirX * 12, rotate - dirY * 14, rotate + 5, rotate],
    }
  })
}

export function FloatingPages({ urls, variant = 'pages' }: FloatingPagesProps) {
  const particles = useMemo(() => buildParticles(urls), [urls])

  return (
    <div className={`floating-pages floating-pages--${variant}`} aria-hidden>
      {particles.map((p, i) => (
        <div
          key={`${p.url}-${i}`}
          className="floating-pages__slot"
          style={{ left: `${p.left}%`, top: `${p.top}%`, zIndex: i + 1 }}
        >
          <motion.div
            className="floating-pages__item"
            initial={{ opacity: 0, scale: 0, rotate: p.rotate - 16 }}
            animate={{
              opacity: 1,
              scale: [0, 1.2, 1],
              x: p.pathX,
              y: p.pathY,
              rotate: p.pathR,
            }}
            transition={{
              opacity: { duration: 0.3, delay: p.delay },
              scale: {
                duration: 0.5,
                delay: p.delay,
                times: [0, 0.55, 1],
                ease: [0.22, 1, 0.36, 1],
              },
              x: {
                duration: p.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: p.delay + 0.25,
              },
              y: {
                duration: p.duration * 1.18,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: p.delay + 0.25,
              },
              rotate: {
                duration: p.duration * 1.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: p.delay + 0.25,
              },
            }}
          >
            <img src={p.url} alt="" draggable={false} />
          </motion.div>
        </div>
      ))}
    </div>
  )
}
