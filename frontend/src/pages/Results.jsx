import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'

export default function Results() {
  const { lastResult, setSelectedGame } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    if (!lastResult) navigate('/profile')
  }, [lastResult, navigate])

  if (!lastResult) return null

  function playAnotherRound() {
    setSelectedGame(null)
    navigate('/games')
  }

  function startNewAssessment() {
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
          <div className="val">{lastResult.ending_level}</div>
          <div className="lbl">Level reached</div>
        </div>
        <div className="mg-stat-card">
          <div className="val">{lastResult.new_current_level}</div>
          <div className="lbl">Your best level</div>
        </div>
      </div>

      <div className="mg-tip-box">
        <span>💡</span>
        <span>{lastResult.tip}</span>
      </div>

      <div className="mg-btn-row">
        <button className="mg-btn" onClick={playAnotherRound}>
          Play again
        </button>
        <button className="mg-btn mg-btn-outline" onClick={startNewAssessment}>
          Retake assessment
        </button>
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 18, textAlign: 'center' }}>
        This is a self-reflection tool, not a clinical diagnosis. If you're struggling, please reach out to a
        professional or someone you trust.
      </p>
    </Layout>
  )
}
