import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Google OAuth is registered for localhost, which is a different redirect URI
// from 127.0.0.1 even when both addresses reach this development server.
if (window.location.hostname === '127.0.0.1' && window.location.port === '5173') {
  const localUrl = new URL(window.location.href)
  localUrl.hostname = 'localhost'
  window.location.replace(localUrl.href)
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
