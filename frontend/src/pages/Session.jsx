import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'
import ChoppingGame from '../components/ChoppingGame.jsx'
import CalmBreathingGame from '../components/CalmBreathingGame.jsx'
import MemorySequenceGame from '../components/MemorySequenceGame.jsx'
import ThoughtSortingGame from '../components/ThoughtSortingGame.jsx'

const GAME_COMPONENTS = {
  'click-timing': ChoppingGame,
  'breath-pacing': CalmBreathingGame,
  'sequence-memory': MemorySequenceGame,
  'thought-sorting': ThoughtSortingGame,
}

const SCENARIO_EMOJI = {
  stress: '🔥',
  anxiety: '🌀',
  conflict: '⚡',
  unrest: '🌊',
  burnout: '🕯️',
  loneliness: '🌙',
}

export default function Session() {
  const { profile, scenario, questions, selectedGame, setLastResult, setIntakeEntryStep } = useApp()
  const navigate = useNavigate()

  const [tab, setTab] = useState('game') // 'game' | 'info'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!scenario || !selectedGame) {
      navigate('/games', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!scenario || !selectedGame) return null

  async function handleGameOver(result) {
    setSubmitting(true)
    setError('')
    try {
      const assessment = await api.submitScore({
        profile: profile || {},
        scenario_game_id: selectedGame.scenarioGameId,
        starting_level: selectedGame.startingLevel,
        was_restart: selectedGame.wasRestart,
        score: result.score,
        max_level: result.maxLevel,
        chopped: result.chopped,
        missed: result.missed,
      })
      setLastResult(assessment)
      navigate('/results', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const GameComponent = GAME_COMPONENTS[selectedGame.mechanic] || ChoppingGame

  function changeAnswers() {
    setIntakeEntryStep('likert')
    navigate('/profile')
  }

  function startOver() {
    setIntakeEntryStep('context')
    navigate('/profile')
  }

  return (
    <Layout wide>
      <div className="mg-session-header">
        <span className="mg-badge">{scenario.primary.label} session</span>
        <h1 style={{ marginTop: 8 }}>{selectedGame.title}</h1>
        <div className="mg-session-back-links">
          <button className="mg-link-btn" onClick={changeAnswers}>
            ← Change my answers
          </button>
          <button className="mg-link-btn" onClick={startOver}>
            ← Start over from the beginning
          </button>
        </div>
      </div>

      <div className="mg-tab-bar">
        <button className={`mg-tab ${tab === 'game' ? 'active' : ''}`} onClick={() => setTab('game')}>
          🎮 Play Game
        </button>
        <button className={`mg-tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
          📋 Scenario &amp; Questions
        </button>
      </div>

      {error && <div className="mg-error">{error}</div>}

      {tab === 'game' && (
        <div className="mg-tab-panel">
          {submitting ? (
            <div className="mg-loading-screen">
              <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Scoring your session…</p>
            </div>
          ) : (
            <GameComponent onGameOver={handleGameOver} startingLevel={selectedGame.startingLevel} />
          )}
        </div>
      )}

      {tab === 'info' && (
        <div className="mg-tab-panel mg-two-pane">
          <div className="mg-pane">
            <h3 className="mg-pane-title">Identified scenario</h3>
            <div className="mg-scenario-hero mg-scenario-hero-compact">
              <span className="mg-emoji">{SCENARIO_EMOJI[scenario.primary.id] || '💭'}</span>
              <div>
                <h2>{scenario.primary.label}</h2>
                <p>{scenario.primary.reason}</p>
              </div>
            </div>

            {scenario.candidates && scenario.candidates.length > 1 && (
              <>
                <h4 style={{ margin: '18px 0 10px', fontSize: '.9rem' }}>How this compares to other patterns</h4>
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
              </>
            )}
          </div>

          <div className="mg-pane mg-pane-scroll">
            <h3 className="mg-pane-title">Reflection questions (simplest first)</h3>
            {questions && questions.length > 0 ? (
              questions.map((q, i) => (
                <div key={q.id} className="mg-question-card">
                  <div className="mg-difficulty-tag">Question {i + 1} · Difficulty {q.difficulty}/6</div>
                  <p className="mg-question-narrative-sm">{q.narrative}</p>
                  <div className="mg-option-list-sm">
                    {q.options.map((opt) => (
                      <div key={opt.id} className="mg-option-sm">
                        <span className="mg-option-letter">{opt.id}</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="mg-subtitle">No questions available for this session.</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
