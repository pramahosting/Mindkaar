import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from './Layout.jsx'

export default function PublicOnlyRoute({ children }) {
  const { user, setScenario } = useApp()
  const [resolving, setResolving] = useState(!!user)
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
      .catch(() => {
        // If the status check itself fails (e.g. backend briefly down),
        // fall back to showing the login page rather than getting stuck
        // on an endless spinner.
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (user && resolving) {
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
