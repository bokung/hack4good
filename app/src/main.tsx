import * as React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './App.css'
import './index.css'
import './styles/global.css'


createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
