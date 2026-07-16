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

const MECHANIC_ICON = {
  'click-timing': '🔪',
  'breath-pacing': '🫁',
}

export default function GameSelect() {
  const { scenario, setScenarioGames, setSelectedGame } = useApp()
  const navigate = useNavigate()

  const [games, setGames] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!scenario) {
      navigate('/profile')
      return
    }
    api
      .getScenarioGames(scenario.primary.id)
      .then((data) => {
        setGames(data.games)
        setScenarioGames(data.games)
      })
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!scenario) return null

  function pick(game, { restart }) {
    setSelectedGame({
      scenarioGameId: game.scenario_game_id,
      gameCode: game.game_code,
      title: game.title,
      description: game.description,
      mechanic: game.mechanic,
      startingLevel: restart ? 1 : game.current_level,
      wasRestart: restart,
    })
    navigate('/session')
  }

  return (
    <Layout wide>
      <div className="mg-scenario-hero">
        <span className="mg-emoji">{SCENARIO_EMOJI[scenario.primary.id] || '💭'}</span>
        <div>
          <span className="mg-badge">Your scenario</span>
          <h2>{scenario.primary.label}</h2>
          <p>{scenario.primary.reason}</p>
        </div>
      </div>

      <h3 style={{ margin: '22px 0 14px', fontSize: '1rem' }}>Choose your exercise</h3>
      {error && <div className="mg-error">{error}</div>}

      {!games ? (
        <div className="mg-loading-screen">
          <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
        </div>
      ) : (
        <div className="mg-game-picker-grid">
          {games.map((game) => (
            <div className="mg-game-picker-card" key={game.scenario_game_id}>
              <div className="mg-game-picker-icon">{MECHANIC_ICON[game.mechanic] || '🎮'}</div>
              <h4>{game.title}</h4>
              <p className="mg-game-picker-desc">{game.description}</p>

              <div className="mg-game-picker-stats">
                <span>Level {game.current_level}</span>
                <span>Best score {game.best_score}</span>
                <span>{game.times_played} play{game.times_played === 1 ? '' : 's'}</span>
              </div>

              <div className="mg-btn-row">
                <button className="mg-btn" onClick={() => pick(game, { restart: false })}>
                  {game.times_played > 0 ? `Continue at Level ${game.current_level}` : 'Play'}
                </button>
                {game.times_played > 0 && (
                  <button className="mg-btn mg-btn-outline" onClick={() => pick(game, { restart: true })}>
                    Restart from Level 1
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
