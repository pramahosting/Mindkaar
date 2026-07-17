import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from './Layout.jsx'

export default function PublicOnlyRoute({ children }) {
  const { user, setScenario } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    let cancelled = false

    api
      .getMyStatus()
      .then((status) => {
        if (cancelled) return
        if (status.has_assessment && status.latest_scenario) {
          setScenario({ primary: status.latest_scenario, candidates: [status.latest_scenario] })
          navigate('/games', { replace: true })
        } else {
          navigate('/profile', { replace: true })
        }
      })
      .catch((err) => {
        // An authenticated user should NEVER see the login form again,
        // even if this status check itself fails for some transient
        // reason (e.g. a momentary backend hiccup). Default them
        // somewhere safe instead of falling back to showing login.
        console.error('Could not check assessment status, defaulting to /profile:', err)
        if (!cancelled) navigate('/profile', { replace: true })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (user) {
    return (
      <Layout>
        <div className="mg-loading-screen">
          <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back - picking up where you left off…</p>
        </div>
      </Layout>
    )
  }

  return children
}
