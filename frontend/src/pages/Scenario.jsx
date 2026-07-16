import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
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
  const { profile, scenario, questions, setGameConfig } = useApp()
  const navigate = useNavigate()

  const [step, setStep] = useState(-1) // -1 = overview, 0..n-1 = question index, n = done
  const [selectedByQuestion, setSelectedByQuestion] = useState({})
  const [loadingGame, setLoadingGame] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile || !scenario) navigate('/profile')
  }, [profile, scenario, navigate])

  if (!profile || !scenario) return null

  const total = questions?.length || 0
  const current = step >= 0 && step < total ? questions[step] : null

  function selectOption(optionId) {
    setSelectedByQuestion((prev) => ({ ...prev, [current.id]: optionId }))
  }

  function nextStep() {
    if (step < total - 1) setStep(step + 1)
    else setStep(total) // done with questions
  }

  async function startGame() {
    setError('')
    setLoadingGame(true)
    try {
      const config = await api.getGameConfig(scenario.primary.id)
      setGameConfig(config)
      navigate('/game')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingGame(false)
    }
  }

  // ── Overview screen: identified scenario + candidate breakdown ──
  if (step === -1) {
    return (
      <Layout wide>
        <div className="mg-scenario-hero">
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

        {error && <div className="mg-error">{error}</div>}

        <p className="mg-subtitle">
          Next, {total} short reflection questions - ordered from simplest to most complex - before your coping exercise.
        </p>
        <button className="mg-btn" onClick={() => setStep(0)}>
          Start reflection questions
        </button>
      </Layout>
    )
  }

  // ── Question stepper ──
  if (current) {
    const selected = selectedByQuestion[current.id]
    return (
      <Layout>
        <div className="mg-question-progress">
          {questions.map((_, i) => (
            <div key={i} className={`mg-question-dot ${i < step ? 'done' : i === step ? 'current' : ''}`} />
          ))}
        </div>

        <div className="mg-difficulty-tag">Question {step + 1} of {total} · Difficulty {current.difficulty}/6</div>
        <p className="mg-question-narrative">{current.narrative}</p>

        <div className="mg-option-list">
          {current.options.map((opt) => (
            <button
              key={opt.id}
              className={`mg-option ${selected === opt.id ? 'selected' : ''}`}
              onClick={() => selectOption(opt.id)}
              type="button"
            >
              <span className="mg-option-letter">{opt.id}</span>
              <span>{opt.text}</span>
            </button>
          ))}
        </div>

        <button className="mg-btn" disabled={!selected} onClick={nextStep}>
          {step < total - 1 ? 'Next question' : 'Continue to your game'}
        </button>
      </Layout>
    )
  }

  // ── Done with questions -> launch game ──
  return (
    <Layout>
      <h1>Nice work.</h1>
      <p className="mg-subtitle">
        Based on your answers, here's a short game designed for your "{scenario.primary.label}" scenario. It gets
        harder the longer you last, so just play until it beats you.
      </p>
      {error && <div className="mg-error">{error}</div>}
      <button className="mg-btn" disabled={loadingGame} onClick={startGame}>
        {loadingGame ? <span className="mg-spinner" /> : 'Play the game'}
      </button>
    </Layout>
  )
}
