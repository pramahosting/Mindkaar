import React, { useEffect, useRef, useState } from 'react'

const MAX_LIVES = 3
const MAX_LEVEL = 6
const BASE_LENGTH = 3

const TILES = [
  { id: 0, emoji: '🔵', color: '#3b82f6' },
  { id: 1, emoji: '🟢', color: '#10b981' },
  { id: 2, emoji: '🟡', color: '#f59e0b' },
  { id: 3, emoji: '🔴', color: '#ef4444' },
]

function sequenceLengthFor(level) {
  return BASE_LENGTH + (level - 1)
}
function highlightMsFor(level) {
  return Math.max(700 - level * 70, 320)
}
function pointsFor(level) {
  return 15 + level * 8
}

function randomSequence(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * TILES.length))
}

export default function MemorySequenceGame({ onGameOver, startingLevel = 1 }) {
  const [level, setLevel] = useState(startingLevel)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [levelBanner, setLevelBanner] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const [sequence, setSequence] = useState([])
  const [phase, setPhase] = useState('idle') // 'showing' | 'input' | 'idle'
  const [activeTile, setActiveTile] = useState(null)
  const [inputIndex, setInputIndex] = useState(0)
  const [flashTile, setFlashTile] = useState(null) // feedback flash on wrong click

  const levelRef = useRef(startingLevel)
  const livesRef = useRef(MAX_LIVES)
  const hitRef = useRef(0)
  const missRef = useRef(0)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const timersRef = useRef([])

  useEffect(() => {
    startRound()
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function schedule(fn, ms) {
    const t = setTimeout(fn, ms)
    timersRef.current.push(t)
    return t
  }

  function startRound() {
    if (gameOverRef.current) return
    const seq = randomSequence(sequenceLengthFor(levelRef.current))
    setSequence(seq)
    setInputIndex(0)
    setPhase('showing')
    playbackSequence(seq)
  }

  function playbackSequence(seq) {
    const highlightMs = highlightMsFor(levelRef.current)
    const gapMs = highlightMs * 0.6

    seq.forEach((tileId, i) => {
      schedule(() => {
        if (gameOverRef.current) return
        setActiveTile(tileId)
        schedule(() => setActiveTile(null), highlightMs * 0.7)
      }, i * (highlightMs + gapMs))
    })

    schedule(() => {
      if (!gameOverRef.current) setPhase('input')
    }, seq.length * (highlightMs + gapMs) + 150)
  }

  function handleTileClick(tileId) {
    if (gameOverRef.current || phase !== 'input') return

    if (tileId === sequence[inputIndex]) {
      const nextIndex = inputIndex + 1
      if (nextIndex >= sequence.length) {
        // Completed the sequence correctly.
        hitRef.current += 1
        scoreRef.current += pointsFor(levelRef.current)
        setScore(scoreRef.current)
        setPhase('idle')

        if (levelRef.current < MAX_LEVEL) {
          levelRef.current += 1
          setLevel(levelRef.current)
          setLevelBanner(true)
          schedule(() => setLevelBanner(false), 1100)
        }
        schedule(startRound, 900)
      } else {
        setInputIndex(nextIndex)
      }
    } else {
      // Wrong tile.
      missRef.current += 1
      setFlashTile(tileId)
      schedule(() => setFlashTile(null), 350)
      loseLife()
    }
  }

  function loseLife() {
    if (gameOverRef.current) return
    livesRef.current -= 1
    setLives(livesRef.current)
    setPhase('idle')
    if (livesRef.current <= 0) {
      endGame()
    } else {
      schedule(startRound, 700)
    }
  }

  function endGame() {
    gameOverRef.current = true
    setGameOver(true)
    setPhase('idle')
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
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

      {levelBanner && <div className="mg-level-banner">Level up! The sequence just grew.</div>}

      <div className="mg-memory-board">
        <div className="mg-memory-status">
          {phase === 'showing' && 'Watch closely…'}
          {phase === 'input' && `Your turn - tile ${inputIndex + 1} of ${sequence.length}`}
          {phase === 'idle' && !gameOver && 'Get ready…'}
        </div>

        <div className="mg-memory-grid">
          {TILES.map((tile) => (
            <button
              key={tile.id}
              className={`mg-memory-tile ${activeTile === tile.id ? 'active' : ''} ${flashTile === tile.id ? 'wrong' : ''}`}
              style={{ '--tile-color': tile.color }}
              disabled={phase !== 'input'}
              onClick={() => handleTileClick(tile.id)}
            >
              {tile.emoji}
            </button>
          ))}
        </div>

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
        Watch the tiles light up, then repeat the pattern back in the same order. The sequence gets longer and
        faster every level.
      </p>
    </div>
  )
}
