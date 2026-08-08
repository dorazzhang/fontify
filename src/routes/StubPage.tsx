import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import './StubPage.css'

type StubPageProps = {
  title: string
  note: string
}

export function StubPage({ title, note }: StubPageProps) {
  return (
    <main className="stub">
      <Link to="/" state={{ skipIntro: true }} className="stub__logo" aria-label="fontify home">
        <Logo placement="corner" />
      </Link>
      <h1>{title}</h1>
      <p>{note}</p>
      <Link className="stub__back" to="/" state={{ skipIntro: true }}>
        Back home
      </Link>
    </main>
  )
}
