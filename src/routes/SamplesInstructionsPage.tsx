import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { UploadShell } from '../components/UploadShell'
import { PhotoDropzone, type SelectedFile } from '../components/PhotoDropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { useSession } from '../state/sessionStore'
import './UploadInstructions.css'

export function SamplesInstructionsPage() {
  const [files, setFiles] = useState<SelectedFile[]>([])
  const { setPhotos, setUploadMode } = useSession()
  const navigate = useNavigate()

  return (
    <UploadShell title="Handwriting samples" backTo="/upload" backLabel="Back">
      <motion.div
        className="upload-instr-stack"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <article className="upload-instr upload-instr--with-bubble">
          <div className="upload-instr__body">
            <p className="upload-instr__lede upload-instr__lede--left">
              Upload photos of your everyday handwriting — journal pages, notes,
              letters, homework, anything that looks like you.
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

        <PhotoDropzone files={files} onChange={setFiles} />

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              className="upload-instr__continue"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
            >
              <PrimaryButton
                onClick={() => {
                  setUploadMode('samples')
                  setPhotos(files)
                  navigate('/upload/processing')
                }}
              >
                Continue
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </UploadShell>
  )
}
