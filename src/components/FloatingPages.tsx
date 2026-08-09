import { motion } from 'framer-motion'
import './FloatingPages.css'

type FloatingPagesProps = {
  urls: string[]
}

/** Gentle orbital float of uploaded page thumbnails */
export function FloatingPages({ urls }: FloatingPagesProps) {
  const items = urls.length > 0 ? urls : []

  return (
    <div className="floating-pages" aria-hidden>
      {items.map((url, i) => {
        const count = items.length
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2
        const radius = count === 1 ? 0 : Math.min(9 + count * 0.6, 14)
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius * 0.72
        const rotate = ((i * 17) % 24) - 12
        const duration = 5.5 + (i % 3) * 0.7

        return (
          <motion.div
            key={`${url}-${i}`}
            className="floating-pages__card"
            style={{
              zIndex: i + 1,
            }}
            initial={{
              opacity: 0,
              scale: 0.7,
              x: `${x}rem`,
              y: `${y}rem`,
              rotate,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: [`${x}rem`, `${x + 0.9}rem`, `${x - 0.7}rem`, `${x}rem`],
              y: [`${y}rem`, `${y - 1.1}rem`, `${y + 0.8}rem`, `${y}rem`],
              rotate: [rotate, rotate + 4, rotate - 3, rotate],
            }}
            transition={{
              opacity: { duration: 0.45, delay: i * 0.08 },
              scale: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
              x: { duration, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 },
              y: { duration: duration * 1.05, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 },
              rotate: { duration: duration * 1.1, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <img src={url} alt="" draggable={false} />
          </motion.div>
        )
      })}
    </div>
  )
}
