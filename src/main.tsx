import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  let hasReloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return
    hasReloaded = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`).catch((error) => {
      console.error("Échec de l'enregistrement du service worker", error)
    })
  })
}
