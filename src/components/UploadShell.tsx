import { useNavigate } from 'react-router-dom'
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

        <div className="upload-shell__logo">
          <Logo placement="corner" />
        </div>
      </header>

      <main className="upload-shell__main">{children}</main>
    </div>
  )
}
