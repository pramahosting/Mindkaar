import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'
import ChoppingGame from '../components/ChoppingGame.jsx'
import CalmBreathingGame from '../components/CalmBreathingGame.jsx'

const GAME_COMPONENTS = {
  'click-timing': ChoppingGame,
  'breath-pacing': CalmBreathingGame,
}

export default function Game() {
  const { profile, scenario, gameConfig, setLastResult } = useApp()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile || !scenario || !gameConfig) navigate('/profile')
  }, [profile, scenario, gameConfig, navigate])

  if (!profile || !scenario || !gameConfig) return null

  async function handleGameOver(result) {
    setSubmitting(true)
    setError('')
    try {
      const assessment = await api.submitScore({
        profile,
        scenario: scenario.primary.id,
        game_id: gameConfig.id,
        score: result.score,
        max_level: result.maxLevel,
        chopped: result.chopped,
        missed: result.missed,
      })
      setLastResult({ ...assessment })
      navigate('/results')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <Layout wide>
      <span className="mg-badge">{scenario.primary.label} exercise</span>
      <h1 style={{ marginTop: 10 }}>{gameConfig.title}</h1>
      <p className="mg-subtitle">{gameConfig.description}</p>

      {error && <div className="mg-error">{error}</div>}

      {submitting ? (
        <div className="mg-loading-screen">
          <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Scoring your session…</p>
        </div>
      ) : (
        (() => {
          const GameComponent = GAME_COMPONENTS[gameConfig.mechanic] || ChoppingGame
          return <GameComponent onGameOver={handleGameOver} />
        })()
      )}
    </Layout>
  )
}
