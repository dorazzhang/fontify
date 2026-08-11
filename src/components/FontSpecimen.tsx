import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PrimaryButton } from './PrimaryButton'
import './FontSpecimen.css'

const SAMPLE = 'The quick brown fox jumps over the lazy dog.'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const PLAYGROUND_DEFAULT = 'Type anything to try your font'

type FontSpecimenProps = {
  /** Object URL or remote URL to a TTF/OTF/WOFF font file */
  fontUrl?: string | null
  familyName?: string
  fontBlob?: Blob | null
}

export function FontSpecimen({
  fontUrl,
  familyName = 'Fontify Hand',
  fontBlob,
}: FontSpecimenProps) {
  const styleId = useId().replace(/:/g, '')
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [faceReady, setFaceReady] = useState(!fontUrl)
  const [tryText, setTryText] = useState(PLAYGROUND_DEFAULT)

  useEffect(() => {
    if (!fontUrl) {
      setFaceReady(true)
      return
    }

    setFaceReady(false)
    const face = new FontFace(familyName, `url(${fontUrl})`, {
      style: 'normal',
      weight: '400',
    })

    let cancelled = false
    face
      .load()
      .then(() => {
        if (cancelled) return
        document.fonts.add(face)
        setFaceReady(true)
      })
      .catch(() => {
        if (!cancelled) setFaceReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [fontUrl, familyName])

  const handleExport = () => {
    if (!fontBlob && !fontUrl) {
      setExportNote('Font file isn’t ready yet.')
      window.setTimeout(() => setExportNote(null), 2600)
      return
    }

    const href = fontBlob ? URL.createObjectURL(fontBlob) : fontUrl!
    const a = document.createElement('a')
    a.href = href
    a.download = `${familyName.replace(/\s+/g, '-').toLowerCase()}.ttf`
    a.click()
    if (fontBlob) URL.revokeObjectURL(href)

    setExportNote('Download started.')
    window.setTimeout(() => setExportNote(null), 2600)
  }

  const faceStyle = fontUrl
    ? { fontFamily: `"${familyName}"` }
    : undefined

  return (
    <div
      className="font-specimen"
      style={faceReady && fontUrl ? faceStyle : undefined}
    >
      <p className="font-specimen__label">
        {fontUrl ? 'Your font' : 'Your font (preview stub)'}
      </p>

      <div
        className="font-specimen__alphabet"
        aria-label="Alphabet A through Z"
        data-face={styleId}
      >
        <p className="font-specimen__row">{UPPER}</p>
        <p className="font-specimen__row">{LOWER}</p>
      </div>

      <p className="font-specimen__sentence">{SAMPLE}</p>

      <div className="font-specimen__try">
        <label className="font-specimen__try-label" htmlFor={`${styleId}-try`}>
          Try it out
        </label>
        <textarea
          id={`${styleId}-try`}
          className="font-specimen__try-input"
          value={tryText}
          onChange={(e) => setTryText(e.target.value)}
          onFocus={() => {
            if (tryText === PLAYGROUND_DEFAULT) setTryText('')
          }}
          rows={3}
          spellCheck={false}
          placeholder={PLAYGROUND_DEFAULT}
        />
        <p className="font-specimen__try-hint">
          Edit the text above to preview words and sentences in your handwriting.
        </p>
      </div>

      <div className="font-specimen__export">
        <PrimaryButton onClick={handleExport} disabled={!fontUrl && !fontBlob}>
          Export as .ttf
        </PrimaryButton>
        <AnimatePresence>
          {exportNote && (
            <motion.p
              className="font-specimen__export-note"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              {exportNote}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
