import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NoticeProvider } from './components/Notice.tsx'
import { AppDataProvider } from './store/AppDataContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider>
      <NoticeProvider>
        <App />
      </NoticeProvider>
    </AppDataProvider>
  </StrictMode>,
)
