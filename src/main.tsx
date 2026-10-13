import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './store/gameStore'
import { useFxStore } from './store/fxStore'

// En développement uniquement : expose les stores pour piloter des scénarios
// (ex. forcer un niveau de Lien pour tester la cérémonie de serment).
if (import.meta.env.DEV) {
  const devWindow = window as Window & { __roshar?: typeof useGameStore; __rosharFx?: typeof useFxStore }
  devWindow.__roshar = useGameStore
  devWindow.__rosharFx = useFxStore
}

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
