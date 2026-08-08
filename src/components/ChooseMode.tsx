import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './ChooseMode.css'

const options = [
  {
    id: 'upload',
    title: 'Upload a photo',
    blurb: 'Turn photos of your handwriting into a typeface.',
    to: '/upload',
    ready: true,
  },
  {
    id: 'live',
    title: 'Write live',
    blurb: 'Draw each letter here with finger or stylus.',
    to: '/write',
    ready: false,
  },
] as const

export function ChooseMode() {
  const navigate = useNavigate()

  return (
    <div className="choose">
      <motion.p
        className="choose__eyebrow"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        How should we capture your hand?
      </motion.p>

      <div className="choose__options" role="list">
        {options.map((opt, i) => (
          <motion.button
            key={opt.id}
            type="button"
            role="listitem"
            className={`choose__option${opt.ready ? '' : ' choose__option--soon'}`}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 + i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            whileHover={
              opt.ready
                ? {
                    y: -8,
                    scale: 1.06,
                    transition: { type: 'spring', stiffness: 420, damping: 22 },
                  }
                : undefined
            }
            whileTap={opt.ready ? { scale: 0.98 } : undefined}
            onClick={() => {
              if (opt.ready) navigate(opt.to)
            }}
            aria-disabled={!opt.ready}
          >
            <span className="choose__title">{opt.title}</span>
            <span className="choose__blurb">{opt.blurb}</span>
            {!opt.ready && <span className="choose__soon"></span>}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
