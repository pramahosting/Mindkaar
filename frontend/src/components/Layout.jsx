import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext.jsx'
import { setToken, setStoredUser } from '../api.js'

export default function Layout({ children, wide = false }) {
  const { user, setUser, resetFlow } = useApp()
  const navigate = useNavigate()

  function handleLogout() {
    setToken(null)
    setStoredUser(null)
    setUser(null)
    resetFlow()
    navigate('/login')
  }

  return (
    <div className="mg-app">
      <div className="mg-topbar">
        <div className="mg-brand">
          <span className="mg-brand-badge">🧠</span>
          Mind Gym
        </div>
        {user && (
          <div className="mg-topbar-user">
            <span>Hi, {user.name}</span>
            <button className="mg-logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
      <div className="mg-content">
        <div className={`mg-card ${wide ? 'mg-card-wide' : ''}`}>{children}</div>
      </div>
    </div>
  )
}
