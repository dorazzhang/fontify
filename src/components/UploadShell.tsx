import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Logo } from './Logo'
import './UploadShell.css'

type UploadShellProps = {
  title: string
  backTo?: string
  backLabel?: string
  children: ReactNode
}

export function UploadShell({
  title,
  backTo = '/',
  backLabel = 'Back',
  children,
}: UploadShellProps) {
  const navigate = useNavigate()

  return (
    <div className="upload-shell">
      <header className="upload-shell__header">
        <button
          type="button"
          className="upload-shell__back"
          onClick={() => {
            if (backTo === '/') {
              navigate('/', { state: { skipIntro: true } })
            } else {
              navigate(backTo)
            }
          }}
        >
          {backLabel}
        </button>

        <h1 className="upload-shell__title">{title}</h1>

        <Link
          to="/"
          state={{ skipIntro: true }}
          className="upload-shell__logo"
          aria-label="fontify home"
        >
          <Logo placement="corner" />
        </Link>
      </header>

      <main className="upload-shell__main">{children}</main>
    </div>
  )
}
