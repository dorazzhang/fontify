import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PrimaryButton } from './PrimaryButton'
import './FontSpecimen.css'

const SAMPLE = 'The quick brown fox jumps over the lazy dog.'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'

type FontSpecimenProps = {
  onExportStub?: () => void
}

export function FontSpecimen({ onExportStub }: FontSpecimenProps) {
  const [exportNote, setExportNote] = useState(false)

  const handleExport = () => {
    onExportStub?.()
    setExportNote(true)
    window.setTimeout(() => setExportNote(false), 2600)
  }

  return (
    <div className="font-specimen">
      <p className="font-specimen__label">Your font (preview stub)</p>

      <div className="font-specimen__alphabet" aria-label="Alphabet A through Z">
        <p className="font-specimen__row">{UPPER}</p>
        <p className="font-specimen__row">{LOWER}</p>
      </div>

      <p className="font-specimen__sentence">{SAMPLE}</p>

      <div className="font-specimen__export">
        <PrimaryButton onClick={handleExport}>Export as .ttf</PrimaryButton>
        <AnimatePresence>
          {exportNote && (
            <motion.p
              className="font-specimen__export-note"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
