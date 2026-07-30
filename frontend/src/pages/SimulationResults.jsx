import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api.js'
import Layout from '../components/Layout.jsx'
import SimEmotionChart from '../components/SimEmotionChart.jsx'

const SCORE_ROWS = [
  { key: 'empathy_score', label: 'Empathy' },
  { key: 'communication_score', label: 'Communication' },
  { key: 'active_listening_score', label: 'Active listening' },
  { key: 'emotional_awareness_score', label: 'Emotional awareness' },
  { key: 'conflict_resolution_score', label: 'Conflict resolution' },
]

export default function SimulationResults() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getSimResults(sessionId)
      .then(setResults)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load results.'))
  }, [sessionId])

  if (error) {
    return (
      <Layout>
        <p className="mg-error">{error}</p>
      </Layout>
    )
  }

  if (!results) {
    return (
      <Layout>
        <div className="mg-loading-screen">
          <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading results…</p>
        </div>
      </Layout>
    )
  }

  const evaluation = results.evaluation

  return (
    <Layout wide>
      <span className="mg-badge">Simulation complete</span>
      <h1 style={{ marginTop: 10 }}>{results.scenario_title}</h1>

      {evaluation && (
        <>
          <div className="sim-score-grid">
            <div className="sim-score-card sim-score-overall">
              <p className="sim-score-label">Overall score</p>
              <p className="sim-score-value">{evaluation.overall_score}</p>
              <p className="sim-score-outof">out of 100</p>
            </div>
            {SCORE_ROWS.map((row) => (
              <div key={row.key} className="sim-score-card">
                <p className="sim-score-label">{row.label}</p>
                <p className="sim-score-value small">{evaluation[row.key]}</p>
              </div>
            ))}
          </div>

          <div className="sim-two-col">
            <div className="mg-game-picker-card">
              <p className="sim-list-heading strengths">Strengths</p>
              <ul className="sim-list">
                {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="mg-game-picker-card">
              <p className="sim-list-heading weaknesses">Areas for improvement</p>
              <ul className="sim-list">
                {evaluation.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>

          <div className="mg-game-picker-card" style={{ marginTop: 22 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>AI feedback</p>
            <p className="mg-game-picker-desc">{evaluation.feedback}</p>
          </div>
        </>
      )}

      <div className="mg-game-picker-card" style={{ marginTop: 22 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Emotional journey</p>
        <SimEmotionChart history={results.emotion_journey} />
      </div>

      <div className="mg-game-picker-card sim-transcript-panel" style={{ marginTop: 22 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Full conversation transcript</p>
        <div className="sim-transcript-scroll tall">
          {results.transcript.map((m, i) => (
            <div key={i} className={`sim-transcript-line ${m.sender === 'ai' ? 'ai' : 'user'}`}>
              <span className="sim-transcript-sender">{m.sender === 'ai' ? 'AI' : 'You'}: </span>
              {m.message}
            </div>
          ))}
        </div>
      </div>

      <button className="mg-btn" style={{ marginTop: 22, width: '100%' }} onClick={() => navigate('/simulation')}>
        Try another scenario
      </button>
    </Layout>
  )
}
