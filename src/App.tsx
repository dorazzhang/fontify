import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './state/sessionStore'
import { HomePage } from './routes/HomePage'
import { UploadHubPage } from './routes/UploadHubPage'
import { StructuredInstructionsPage } from './routes/StructuredInstructionsPage'
import { SamplesInstructionsPage } from './routes/SamplesInstructionsPage'
import { ProcessingPage } from './routes/ProcessingPage'
import { WriteInstructionsPage } from './routes/WriteInstructionsPage'
import { CapturePage } from './routes/CapturePage'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadHubPage />} />
          <Route path="/upload/structured" element={<StructuredInstructionsPage />} />
          <Route path="/upload/samples" element={<SamplesInstructionsPage />} />
          <Route path="/write" element={<WriteInstructionsPage />} />
          <Route path="/write/capture" element={<CapturePage />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/upload/processing" element={<Navigate to="/processing" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
