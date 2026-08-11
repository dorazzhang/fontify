import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ComingSoonBanner } from '../components/ComingSoonBanner'
import { UploadShell } from '../components/UploadShell'
import './UploadHubPage.css'

const options = [
  {
    id: 'structured',
    title: 'Structured sample',
    blurb: 'Photograph A–Z, a–z, and a pangram sentence using our layout.',
    to: '/upload/structured',
    recommended: true,
  },
  {
    id: 'samples',
    title: 'Handwriting samples',
    blurb: 'Upload pages of your natural writing — aiming for about 200+ words.',
    to: '/upload/samples',
    recommended: false,
  },
] as const

export function UploadHubPage() {
  const navigate = useNavigate()

  return (
    <UploadShell title="Upload a photo" backTo="/" backLabel="Back">
      <div className="upload-hub">
        <ComingSoonBanner />

        <motion.p
          className="upload-hub__eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          How do you want to send your writing?
        </motion.p>

        <div className="upload-hub__options" role="list">
          {options.map((opt, i) => (
            <motion.button
              key={opt.id}
              type="button"
              role="listitem"
              className="upload-hub__option"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{
                y: -8,
                scale: 1.06,
                transition: { type: 'spring', stiffness: 420, damping: 22 },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(opt.to)}
            >
              <span className="upload-hub__title">{opt.title}</span>
              <span className="upload-hub__blurb">{opt.blurb}</span>
              {opt.recommended && (
                <span className="upload-hub__recommended">Recommended</span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </UploadShell>
  )
}
