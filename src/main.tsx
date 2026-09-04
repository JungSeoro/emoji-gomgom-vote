import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AdminResultsPage } from './components/AdminResultsPage'
import './styles.css'

const isAdminResultsRoute = () => window.location.hash.split('?')[0].replace(/\/$/, '') === '#/results'

function Root() {
  const [showAdminResults, setShowAdminResults] = useState(isAdminResultsRoute)

  useEffect(() => {
    const handleHashChange = () => setShowAdminResults(isAdminResultsRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return showAdminResults ? <AdminResultsPage /> : <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
