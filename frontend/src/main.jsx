import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Injeção do Service Worker do PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova atualização do Scalle ERP disponível. Deseja recarregar?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('Scalle ERP está pronto para funcionar offline.')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
