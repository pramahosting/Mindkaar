import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'

export default function Results() {
  const { lastResult, resetFlow } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    if (!lastResult) navigate('/profile')
  }, [lastResult, navigate])

  if (!lastResult) return null

  function playAgain() {
    resetFlow()
    navigate('/profile')
  }

  return (
    <Layout>
      <div className="mg-status-hero">
        <span className="mg-status-label">{lastResult.mental_status}</span>
        <p>{lastResult.summary}</p>
      </div>

      <div className="mg-stat-grid">
        <div className="mg-stat-card">
          <div className="val">{lastResult.score}</div>
          <div className="lbl">Final score</div>
        </div>
        <div className="mg-stat-card">
          <div className="val">{lastResult.max_level}</div>
          <div className="lbl">Level reached</div>
        </div>
      </div>

      <div className="mg-tip-box">
        <span>💡</span>
        <span>{lastResult.tip}</span>
      </div>

      <div className="mg-btn-row">
        <button className="mg-btn" onClick={playAgain}>
          Play again
        </button>
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 18, textAlign: 'center' }}>
        This is a self-reflection tool, not a clinical diagnosis. If you're struggling, please reach out to a
        professional or someone you trust.
      </p>
    </Layout>
  )
}
