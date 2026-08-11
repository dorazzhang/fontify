import { Link } from 'react-router-dom'
import './ComingSoonBanner.css'

type ComingSoonBannerProps = {
  /** Compact for instruction pages under a title */
  compact?: boolean
}

export function ComingSoonBanner({ compact = false }: ComingSoonBannerProps) {
  return (
    <aside
      className={`soon-banner${compact ? ' soon-banner--compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <p className="soon-banner__eyebrow">Preview only</p>
      <p className="soon-banner__title">Photo upload isn’t ready yet</p>
      <p className="soon-banner__body">
        You can look around this flow, but picking photos isn’t available until
        the backend ships. Use{' '}
        <Link className="soon-banner__link" to="/write">
          Write live
        </Link>{' '}
        to create a font today.
      </p>
    </aside>
  )
}
