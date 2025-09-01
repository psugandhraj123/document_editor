import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppWithAuth from './App.tsx'
import StoreProvider from './app/provider.tsx'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <StoreProvider>
      <AppWithAuth />
    </StoreProvider>
  // </StrictMode>,
)
