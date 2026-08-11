import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { UploadShell } from '../components/UploadShell'
import { SampleSheetExample } from '../components/SampleSheetExample'
import { ComingSoonBanner } from '../components/ComingSoonBanner'
import './UploadInstructions.css'

const PANGRAM = 'The quick brown fox jumps over the lazy dog.'

export function StructuredInstructionsPage() {
  return (
    <UploadShell title="Structured sample" backTo="/upload" backLabel="Back">
      <motion.article
        className="upload-instr"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <ComingSoonBanner compact />

        <p className="upload-instr__lede">
          When photo upload ships, you&apos;ll photograph one clear page that
          includes everything below.
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

        <p className="upload-instr__continue-note">
          <Link to="/write">Write live</Link> to build a font now.
        </p>
      </motion.article>
    </UploadShell>
  )
}
