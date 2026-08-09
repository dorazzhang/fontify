import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { UploadShell } from '../components/UploadShell'
import { PrimaryButton } from '../components/PrimaryButton'
import { PANGRAM } from '../lib/letters'
import './UploadInstructions.css'
import './WriteInstructionsPage.css'

export function WriteInstructionsPage() {
  const navigate = useNavigate()

  return (
    <UploadShell title="Write live" backTo="/" backLabel="Back">
      <motion.article
        className="upload-instr write-instr"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="upload-instr__lede">
          Draw each character with your finger or stylus — letters, numbers,
          a few symbols, then a sample sentence.
        </p>

        <ol className="upload-instr__list">
          <li>
            <strong>Letters</strong>
            <span>Write Aa through Zz, one character at a time.</span>
          </li>
          <li>
            <strong>Numbers &amp; symbols</strong>
            <span>0–9 plus ! ? # $ &amp; @</span>
          </li>
          <li>
            <strong>Sample sentence</strong>
            <span className="upload-instr__pangram">&ldquo;{PANGRAM}&rdquo;</span>
          </li>
        </ol>

        <ul className="upload-instr__tips">
          <li>A stylus usually feels more natural than a finger</li>
          <li>Write at a comfortable size inside the guides</li>
          <li>Use Reset anytime; Back returns to the previous character</li>
        </ul>

        <div className="write-instr__start">
          <PrimaryButton onClick={() => navigate('/write/capture')}>Start</PrimaryButton>
        </div>
      </motion.article>
    </UploadShell>
  )
}
