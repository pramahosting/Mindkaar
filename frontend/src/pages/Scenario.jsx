import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'

const SCENARIO_EMOJI = {
  stress: '🔥',
  anxiety: '🌀',
  conflict: '⚡',
  unrest: '🌊',
  burnout: '🕯️',
  loneliness: '🌙',
}

export default function Scenario() {
  const { profile, scenario, questions, reflectionAnswers, setReflectionAnswers } = useApp()
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)

  useEffect(() => {
    if (!profile || !scenario) navigate('/profile')
  }, [profile, scenario, navigate])

  if (!profile || !scenario) return null

  const list = questions || []
  const total = list.length
  const answeredCount = Object.keys(reflectionAnswers).length

  function selectOption(questionId, optionId) {
    setReflectionAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  async function handleSubmit() {
    setError('')
    setPreparing(true)
    try {
      // Build a simulation personalized to these exact reflection
      // questions - they aren't answered here, they're answered as a real
      // conversation in Run Simulation instead.
      if (total > 0) {
        await api.personalizeSimulation({
          category: scenario.primary.id,
          category_label: scenario.primary.label,
          questions: list.map((q) => q.narrative),
        })
      }
    } catch (err) {
      // Best-effort: if this fails, still let the person continue to
      // their game rather than blocking them entirely.
      console.warn('Could not prepare a personalized simulation:', err instanceof ApiError ? err.message : err)
    } finally {
      setPreparing(false)
      navigate('/games')
    }
  }

  return (
    <Layout wide backPosition="bottom">
      <div className="sim-scenario-two-pane">
        {/* LEFT PANE: identified scenario + how it compares */}
        <section className="mg-game-picker-card sim-scenario-pane-left">
          <div className="mg-scenario-hero" style={{ marginBottom: 20 }}>
            <span className="mg-emoji">{SCENARIO_EMOJI[scenario.primary.id] || '💭'}</span>
            <div>
              <span className="mg-badge">Identified scenario</span>
              <h2>{scenario.primary.label}</h2>
              <p>{scenario.primary.reason}</p>
            </div>
          </div>

          <h3 style={{ marginBottom: 12, fontSize: '1rem' }}>How this compares to other patterns</h3>
          <div className="mg-candidate-list">
            {scenario.candidates.map((c) => (
              <div className="mg-candidate" key={c.id}>
                <span className="mg-candidate-label">{c.label}</span>
                <div className="mg-candidate-bar-track">
                  <div className="mg-candidate-bar-fill" style={{ width: `${c.relevance}%` }} />
                </div>
                <span className="mg-candidate-value">{c.relevance}%</span>
              </div>
            ))}
          </div>

          <p className="mg-subtitle" style={{ marginTop: 20 }}>
            Take a look at the {total} reflection question{total === 1 ? '' : 's'} on the right if you'd like -
            you don't need to answer them here. They'll come up as a real conversation in Run Simulation instead.
          </p>
        </section>

        {/* RIGHT PANE: all reflection questions, scrollable, optional preview */}
        <section className="mg-game-picker-card sim-scenario-pane-right">
          <h3 style={{ marginBottom: 4, fontSize: '1rem' }}>Reflection questions</h3>
          <p className="sim-progress-label" style={{ margin: '0 0 14px' }}>
            Optional preview - {answeredCount} of {total} looked at
          </p>

          <div className="sim-scenario-questions-scroll">
            {list.map((q, i) => {
              const selected = reflectionAnswers[q.id]
              return (
                <div key={q.id} className="sim-scenario-question-block">
                  <div className="mg-difficulty-tag">
                    Question {i + 1} of {total} · Difficulty {q.difficulty}/6
                  </div>
                  <p className="mg-question-narrative">{q.narrative}</p>
                  <div className="mg-option-list">
                    {q.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`mg-option ${selected === opt.id ? 'selected' : ''}`}
                        onClick={() => selectOption(q.id, opt.id)}
                      >
                        <span className="mg-option-letter">{opt.id}</span>
                        <span>{opt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {error && <div className="mg-error" style={{ marginTop: 16 }}>{error}</div>}

          <button className="mg-btn" style={{ marginTop: 18 }} disabled={preparing} onClick={handleSubmit}>
            {preparing ? <span className="mg-spinner" /> : 'Continue to your exercise'}
          </button>
        </section>
      </div>
    </Layout>
  )
}
