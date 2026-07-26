import { useState } from 'react'
import AppRouter from '../routes/AppRouter.jsx'
import {
  clearStoredAdmin,
  clearStoredToken,
  getStoredToken,
  loginAdmin,
} from '../services/auth.js'
import '../styles/app.css'

function App() {
  const [token, setToken] = useState(() => getStoredToken())

  async function handleLogin(credentials) {
    const response = await loginAdmin(credentials)
    setToken(response.token)
  }

  function handleLogout() {
    clearStoredToken()
    clearStoredAdmin()
    setToken('')
  }

  return (
    <AppRouter
      isAuthenticated={Boolean(token)}
      onLogin={handleLogin}
      onLogout={handleLogout}
    />
  )
}

export default App
