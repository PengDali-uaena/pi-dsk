import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppFrame } from './app/AppFrame'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppFrame />
  </StrictMode>
)
