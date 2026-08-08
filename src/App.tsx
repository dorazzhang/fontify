import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './routes/HomePage'
import { StubPage } from './routes/StubPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/upload/*"
          element={
            <StubPage
              title="Upload path"
              note="structured alphabet samples or handwritten notes."
            />
          }
        />
        <Route
          path="/write/*"
          element={
            <StubPage
              title="Write live"
              note="live stylus capture lands after the upload flow."
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
