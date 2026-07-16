import React, { useEffect, useRef, useState } from 'react'

const MAX_LIVES = 3
const MAX_LEVEL = 6
const LEVEL_UP_EVERY = 5

function beatIntervalFor(level) {
  return Math.max(2700 - level * 300, 1100)
}
function windowDurationFor(level) {
  return Math.max(950 - level * 100, 350)
}
function pointsFor(level) {
  return 10 + level * 5
}

export default function CalmBreathingGame({ onGameOver, startingLevel = 1 }) {
  const [phase, setPhase] = useState('inhale') // 'inhale' | 'exhale'
  const [beatActive, setBeatActive] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [level, setLevel] = useState(startingLevel)
  const [levelBanner, setLevelBanner] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const levelRef = useRef(startingLevel)
  const livesRef = useRef(MAX_LIVES)
  const hitRef = useRef(0)
  const missRef = useRef(0)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const beatHandledRef = useRef(true)
  const phaseRef = useRef('inhale')

  const beatTimer = useRef(null)
  const windowTimer = useRef(null)

  useEffect(() => {
    beatTimer.current = setTimeout(scheduleBeat, 900)
    return () => {
      clearTimeout(beatTimer.current)
      clearTimeout(windowTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scheduleBeat() {
    if (gameOverRef.current) return

    phaseRef.current = phaseRef.current === 'inhale' ? 'exhale' : 'inhale'
    setPhase(phaseRef.current)

    beatHandledRef.current = false
    setBeatActive(true)

    const windowMs = windowDurationFor(levelRef.current)
    windowTimer.current = setTimeout(() => resolveBeat(false), windowMs)

    beatTimer.current = setTimeout(scheduleBeat, beatIntervalFor(levelRef.current))
  }

  function resolveBeat(hit) {
    if (gameOverRef.current || beatHandledRef.current) return
    beatHandledRef.current = true
    setBeatActive(false)
    clearTimeout(windowTimer.current)

    if (hit) {
      hitRef.current += 1
      scoreRef.current += pointsFor(levelRef.current)
      setScore(scoreRef.current)

      if (hitRef.current % LEVEL_UP_EVERY === 0 && levelRef.current < MAX_LEVEL) {
        levelRef.current += 1
        setLevel(levelRef.current)
        setLevelBanner(true)
        setTimeout(() => setLevelBanner(false), 1100)
      }
    } else {
      missRef.current += 1
      livesRef.current -= 1
      setLives(livesRef.current)
      if (livesRef.current <= 0) {
        endGame()
      }
    }
  }

  function handleTap() {
    if (gameOverRef.current || !beatActive) return
    resolveBeat(true)
  }

  function endGame() {
    gameOverRef.current = true
    setGameOver(true)
    clearTimeout(beatTimer.current)
    clearTimeout(windowTimer.current)
    setBeatActive(false)
  }

  function handleFinish() {
    onGameOver({
      score: scoreRef.current,
      maxLevel: levelRef.current,
      chopped: hitRef.current,
      missed: missRef.current,
    })
  }

  return (
    <div className="mg-game-shell">
      <div className="mg-game-hud">
        <div className="mg-hud-stat">
          <div className="val">{score}</div>
          <div className="lbl">Score</div>
        </div>
        <div className="mg-hud-stat">
          <div className="val">{level}</div>
          <div className="lbl">Level</div>
        </div>
        <div className="mg-hud-stat">
          <div className="val">{'❤️'.repeat(Math.max(lives, 0)) || '—'}</div>
          <div className="lbl">Lives</div>
        </div>
      </div>

      {levelBanner && <div className="mg-level-banner">Level up! The pace is quickening.</div>}

      <div className="mg-breath-board">
        <div className="mg-breath-phase-label">{phase === 'inhale' ? 'Breathe in…' : 'Breathe out…'}</div>
        <div className={`mg-breath-ring ${phase}`} />
        <button
          className={`mg-breath-tap-btn ${beatActive ? 'active' : ''}`}
          onClick={handleTap}
          disabled={!beatActive}
        >
          Tap now
        </button>

        {gameOver && (
          <div className="mg-game-overlay">
            <h2 style={{ color: '#fff' }}>Game Over</h2>
            <p>You reached level {level} with a final score of {score}.</p>
            <button className="mg-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={handleFinish}>
              See my results
            </button>
          </div>
        )}
      </div>

      <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 500 }}>
        Tap "Tap now" the moment it lights up, right as your breath should turn. The window shrinks and the pace
        quickens every {LEVEL_UP_EVERY} successful taps.
      </p>
    </div>
  )
}
