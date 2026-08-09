import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { UploadShell } from '../components/UploadShell'
import { SampleSheetExample } from '../components/SampleSheetExample'
import { PhotoDropzone, type SelectedFile } from '../components/PhotoDropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { useSession } from '../state/sessionStore'
import './UploadInstructions.css'

const PANGRAM = 'The quick brown fox jumps over the lazy dog.'

export function StructuredInstructionsPage() {
  const [files, setFiles] = useState<SelectedFile[]>([])
  const { setPhotos, setUploadMode } = useSession()
  const navigate = useNavigate()

  return (
    <UploadShell title="Structured sample" backTo="/upload" backLabel="Back">
      <motion.article
        className="upload-instr"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="upload-instr__lede">
          Photograph one clear page that includes everything below, then upload it
          here.
        </p>

        <ol className="upload-instr__list">
          <li>
            <strong>Uppercase alphabet</strong>
            <span>A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</span>
          </li>
          <li>
            <strong>Lowercase alphabet</strong>
            <span>a b c d e f g h i j k l m n o p q r s t u v w x y z</span>
          </li>
          <li>
            <strong>Pangram sentence</strong>
            <span className="upload-instr__pangram">&ldquo;{PANGRAM}&rdquo;</span>
          </li>
        </ol>

        <figure className="upload-instr__example">
          <SampleSheetExample pangram={PANGRAM} />
          <figcaption>Example of what to write and photograph</figcaption>
        </figure>

        <ul className="upload-instr__tips">
          <li>Use plain, unlined paper if you can</li>
          <li>Write in your natural hand — don&apos;t over-neat</li>
          <li>Shoot from above in even light, with all letters fully in frame</li>
        </ul>

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
                  setUploadMode('structured')
                  setPhotos(files)
                  navigate('/processing', { state: { source: 'structured' } })
                }}
              >
                Continue
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </UploadShell>
  )
}
