import React from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useApp } from '../AppContext.jsx'
import { setToken, setStoredUser } from '../api.js'
import Logo from './Logo.jsx'

// Pages reached via replace:true navigation (Login -> Profile, Profile ->
// Scenario, etc.) leave nothing real in browser history to go back to, so
// navigate(-1) can silently do nothing. Instead, every page gets an
// explicit, predictable back destination here.
const NO_BACK_BUTTON = ['/profile']

export default function Layout({ children, wide = false, backPosition = 'top' }) {
  const { user, setUser, resetFlow, scenario, setIntakeEntryStep } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  function handleLogout() {
    setToken(null)
    setStoredUser(null)
    setUser(null)
    resetFlow()
    navigate('/login')
  }

  function goToGames() {
    navigate(scenario ? '/games' : '/profile')
  }

  function goBack() {
    const path = location.pathname

    if (path.startsWith('/scenario')) {
      setIntakeEntryStep('likert')
      navigate('/profile')
      return
    }
    if (path.startsWith('/games')) {
      navigate(scenario ? '/scenario' : '/profile')
      return
    }
    if (path.startsWith('/session')) {
      navigate('/games')
      return
    }
    if (path.startsWith('/results')) {
      navigate('/session')
      return
    }
    if (path.startsWith('/register')) {
      navigate('/login')
      return
    }
    if (path.startsWith('/login')) {
      navigate('/')
      return
    }
    if (params.sessionId && path.startsWith('/simulation') && path.endsWith('/results')) {
      navigate('/simulation')
      return
    }
    if (params.sessionId && path.startsWith('/simulation')) {
      navigate('/simulation')
      return
    }
    if (path.startsWith('/simulation')) {
      navigate(user ? '/games' : '/login')
      return
    }

    // Fallback for any page not explicitly listed above.
    navigate(user ? '/games' : '/login')
  }

  const showBackButton = !NO_BACK_BUTTON.includes(location.pathname)

  return (
    <div className="mg-app">
      <div className="mg-topbar">
        <button className="mg-brand mg-brand-link" onClick={() => navigate(user ? '/games' : '/')}>
          <Logo size={30} light />
        </button>
        {user && !location.pathname.startsWith('/profile') && (
          <nav className="mg-topbar-nav">
            <button
              className={`mg-topbar-nav-link ${
                !location.pathname.startsWith('/simulation') &&
                ['/profile', '/scenario', '/games', '/session', '/results'].some((p) => location.pathname.startsWith(p))
                  ? 'active'
                  : ''
              }`}
              onClick={goToGames}
            >
              Games
            </button>
            <button
              className={`mg-topbar-nav-link ${location.pathname.startsWith('/simulation') ? 'active' : ''}`}
              onClick={() => navigate('/simulation')}
            >
              Run Simulation
            </button>
          </nav>
        )}
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
        <div className={`mg-card ${wide ? 'mg-card-wide' : ''}`}>
          {showBackButton && backPosition === 'top' && (
            <button className="mg-btn mg-btn-outline mg-back-btn" onClick={goBack} aria-label="Go back">
              <span aria-hidden="true">←</span> Back
            </button>
          )}
          {children}
          {showBackButton && backPosition === 'bottom' && (
            <button className="mg-btn mg-btn-outline mg-back-btn mg-back-btn-bottom" onClick={goBack} aria-label="Go back">
              <span aria-hidden="true">←</span> Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
