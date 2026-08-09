import './WritingGuides.css'

function GuideBand() {
  return (
    <div className="writing-guides__band">
      <span className="writing-guides__line writing-guides__line--solid writing-guides__line--top" />
      <span className="writing-guides__line writing-guides__line--mid" />
      <span className="writing-guides__line writing-guides__line--solid writing-guides__line--bottom" />
    </div>
  )
}

/** Simple handwriting guides — two solid lines, dotted midline */
export function WritingGuides({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`writing-guides${wide ? ' writing-guides--wide' : ''}`} aria-hidden>
      <GuideBand />
      {wide && <GuideBand />}
    </div>
  )
}
