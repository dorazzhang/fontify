import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './routes/HomePage'
import { StubPage } from './routes/StubPage'
import { UploadHubPage } from './routes/UploadHubPage'
import { StructuredInstructionsPage } from './routes/StructuredInstructionsPage'
import { SamplesInstructionsPage } from './routes/SamplesInstructionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadHubPage />} />
        <Route path="/upload/structured" element={<StructuredInstructionsPage />} />
        <Route path="/upload/samples" element={<SamplesInstructionsPage />} />
        <Route
          path="/write/*"
          element={
            <StubPage
              title="Write live"
              note="Live stylus capture lands after the upload flow."
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
