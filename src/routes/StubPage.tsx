import { Link } from 'react-router-dom'
import './StubPage.css'

type StubPageProps = {
  title: string
  note: string
}

export function StubPage({ title, note }: StubPageProps) {
  return (
    <main className="stub">
      <p className="stub__kicker">fontify</p>
      <h1>{title}</h1>
      <p>{note}</p>
      <Link className="stub__back" to="/" state={{ skipIntro: true }}>
        Back home
      </Link>
    </main>
  )
}
