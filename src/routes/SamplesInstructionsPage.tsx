import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { UploadShell } from '../components/UploadShell'
import { ComingSoonBanner } from '../components/ComingSoonBanner'
import './UploadInstructions.css'

export function SamplesInstructionsPage() {
  return (
    <UploadShell title="Handwriting samples" backTo="/upload" backLabel="Back">
      <motion.div
        className="upload-instr-stack"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <ComingSoonBanner compact />

        <article className="upload-instr upload-instr--with-bubble">
          <div className="upload-instr__body">
            <p className="upload-instr__lede upload-instr__lede--left">
              When photo upload ships, you&apos;ll send photos of your everyday
              handwriting — journal pages, notes, letters, homework, anything that
              looks like you.
            </p>

            <ul className="upload-instr__tips">
              <li>Multiple pages are better than one cramped photo</li>
              <li>Include both capitals and lowercase when you have them</li>
              <li>Avoid heavy shadows, filters, or cropped-off margins</li>
              <li>
                The more context you share, the more complete and natural your font
                will feel. Thin samples or low-quality photos can lead to weaker
                results.
              </li>
            </ul>
          </div>

          <aside className="upload-instr__bubble" aria-label="Disclaimer">
            <p>
              Aim for about <strong>200 words</strong> or more across your photos,
              with a healthy mix of letters and letter pairs.
            </p>
          </aside>
        </article>

        <p className="upload-instr__continue-note">
          <Link to="/write">Write live</Link> to build a font now.
        </p>
      </motion.div>
    </UploadShell>
  )
}
