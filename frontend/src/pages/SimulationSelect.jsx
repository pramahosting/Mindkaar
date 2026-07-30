import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'
import { recommendedSimSlug } from '../lib/scenarioMapping.js'

const DIFFICULTY_CLASS = {
  easy: 'sim-difficulty-easy',
  medium: 'sim-difficulty-medium',
  hard: 'sim-difficulty-hard',
}

export default function SimulationSelect() {
  const navigate = useNavigate()
  const { scenario, questions } = useApp()
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [personalizing, setPersonalizing] = useState(false)
  const [error, setError] = useState('')
  const [startingId, setStartingId] = useState(null)

  const fallbackRecommendedSlug = recommendedSimSlug(scenario)
  const hasPersonalScenario = scenarios.some((s) => s.is_personal)
  const canBuildPersonal = !!(scenario?.primary && questions && questions.length > 0)

  async function loadScenarios() {
    const data = await api.listSimScenarios()
    const sorted = [...data].sort((a, b) => {
      const aPersonal = a.is_personal ? 1 : 0
      const bPersonal = b.is_personal ? 1 : 0
      if (aPersonal !== bPersonal) return bPersonal - aPersonal
      if (!aPersonal && a.slug === fallbackRecommendedSlug) return -1
      if (!bPersonal && b.slug === fallbackRecommendedSlug) return 1
      return 0
    })
    setScenarios(sorted)
    return sorted
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const initial = await loadScenarios()
        // If we already have an assessment scenario + reflection questions
        // in context but no personal simulation shows up yet (e.g. it
        // wasn't built earlier, or building it failed silently before),
        // build it right here instead of leaving the person to only ever
        // see the 4 generic scenarios.
        if (!cancelled && !initial.some((s) => s.is_personal) && scenario?.primary && questions?.length) {
          setPersonalizing(true)
          try {
            await api.personalizeSimulation({
              category: scenario.primary.id,
              category_label: scenario.primary.label,
              questions: questions.map((q) => q.narrative),
            })
            if (!cancelled) await loadScenarios()
          } catch (err) {
            if (!cancelled) {
              setError(
                err instanceof ApiError
                  ? `Couldn't build your personalized simulation: ${err.message}`
                  : "Couldn't build your personalized simulation."
              )
            }
          } finally {
            if (!cancelled) setPersonalizing(false)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load scenarios.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBuildPersonal() {
    setError('')
    setPersonalizing(true)
    try {
      await api.personalizeSimulation({
        category: scenario.primary.id,
        category_label: scenario.primary.label,
        questions: questions.map((q) => q.narrative),
      })
      await loadScenarios()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't build your personalized simulation.")
    } finally {
      setPersonalizing(false)
    }
  }

  async function handleStart(scenarioId) {
    setStartingId(scenarioId)
    setError('')
    try {
      const res = await api.startSimulation(scenarioId)
      navigate(`/simulation/${res.session_id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start simulation.')
      setStartingId(null)
    }
  }

  return (
    <Layout wide backPosition="bottom">
      <span className="mg-badge">Run Simulation</span>
      <h1 style={{ marginTop: 10 }}>Have a real spoken conversation</h1>
      <p className="mg-subtitle">
        Pick a scenario, put on your headset, and talk it through with an AI character. Your response is
        analyzed for empathy, relevance, and de-escalation in real time, and the character reacts accordingly.
      </p>

      {hasPersonalScenario && (
        <div className="sim-recommend-banner">
          The scenario marked <strong>Built for you</strong> below asks your own reflection questions from the
          assessment as a real conversation - that's the one worth starting with.
        </div>
      )}

      {!hasPersonalScenario && !loading && canBuildPersonal && (
        <div className="sim-recommend-banner">
          We haven't built a simulation from your reflection questions yet.{' '}
          <button className="mg-link-btn" onClick={handleBuildPersonal} disabled={personalizing}>
            {personalizing ? 'Building it now…' : 'Build it now'}
          </button>
        </div>
      )}

      {!hasPersonalScenario && !loading && !canBuildPersonal && (
        <div className="sim-recommend-banner">
          Complete the intake assessment first and we'll build a simulation here from your own reflection
          questions.
        </div>
      )}

      {!hasPersonalScenario && scenario?.primary && fallbackRecommendedSlug && (
        <div className="sim-recommend-banner">
          In the meantime, based on your <strong>{scenario.primary.label}</strong> scenario, we'd suggest
          starting with the one marked <strong>Recommended for you</strong> below.
        </div>
      )}

      {error && <div className="mg-error">{error}</div>}

      {loading || personalizing ? (
        <div className="mg-loading-screen">
          <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
        </div>
      ) : (
        <div className="mg-game-picker-grid">
          {scenarios.map((s) => {
            const isFallbackRecommended = !hasPersonalScenario && s.slug === fallbackRecommendedSlug
            return (
              <div
                className={`mg-game-picker-card ${s.is_personal || isFallbackRecommended ? 'sim-recommended-card' : ''}`}
                key={s.id}
              >
                <div className="sim-scenario-card-top">
                  <h4>{s.title}</h4>
                  <span className={`sim-difficulty-badge ${DIFFICULTY_CLASS[s.difficulty] || ''}`}>{s.difficulty}</span>
                </div>
                {s.is_personal && <span className="sim-recommended-tag">Built for you</span>}
                {isFallbackRecommended && <span className="sim-recommended-tag">Recommended for you</span>}
                <p className="mg-game-picker-desc">{s.description}</p>
                <div className="mg-game-picker-stats">
                  <span>{s.character.name} · {s.character.role}</span>
                  <span>{s.total_questions} exchanges</span>
                </div>
                <button
                  className="mg-btn"
                  disabled={startingId !== null}
                  onClick={() => handleStart(s.id)}
                >
                  {startingId === s.id ? <span className="mg-spinner" /> : 'Start simulation'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
