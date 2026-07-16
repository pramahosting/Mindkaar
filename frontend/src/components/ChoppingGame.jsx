import React, { useEffect, useRef, useState } from 'react'

const GOOD_ITEMS = ['🥕', '🍅', '🥒', '🧅', '🌶️', '🥦', '🌽', '🍆']
const BAD_ITEMS = ['🪨', '💣']

const BOARD_W = 640
const BOARD_H = 380
const ITEM_SIZE = 54
const MAX_LIVES = 3
const MAX_LEVEL = 6
const LEVEL_UP_EVERY = 6 // chopped items per level

function spawnIntervalFor(level) {
  return Math.max(1500 - level * 170, 480)
}
function lifespanFor(level) {
  return Math.max(1900 - level * 200, 700)
}
function badChanceFor(level) {
  return Math.min(0.08 + level * 0.06, 0.4)
}
function pointsFor(level) {
  return 10 + level * 5
}

export default function ChoppingGame({ onGameOver, startingLevel = 1 }) {
  const [items, setItems] = useState([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [level, setLevel] = useState(startingLevel)
  const [levelBanner, setLevelBanner] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  // Refs mirror latest values so timer callbacks never see stale closures.
  const levelRef = useRef(startingLevel)
  const livesRef = useRef(MAX_LIVES)
  const choppedRef = useRef(0)
  const missedRef = useRef(0)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)

  const idCounter = useRef(0)
  const itemTimers = useRef(new Map())
  const spawnTimer = useRef(null)

  useEffect(() => {
    spawnTimer.current = setTimeout(scheduleSpawn, 600)
    return () => {
      clearTimeout(spawnTimer.current)
      itemTimers.current.forEach((t) => clearTimeout(t))
      itemTimers.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scheduleSpawn() {
    if (gameOverRef.current) return
    spawnOne()
    spawnTimer.current = setTimeout(scheduleSpawn, spawnIntervalFor(levelRef.current))
  }

  function spawnOne() {
    const bad = Math.random() < badChanceFor(levelRef.current)
    const pool = bad ? BAD_ITEMS : GOOD_ITEMS
    const emoji = pool[Math.floor(Math.random() * pool.length)]
    const id = ++idCounter.current
    const x = Math.random() * (BOARD_W - ITEM_SIZE - 20) + 10
    const y = Math.random() * (BOARD_H - ITEM_SIZE - 20) + 10
    const lifespan = lifespanFor(levelRef.current)

    setItems((prev) => [...prev, { id, emoji, bad, x, y, lifespan }])

    const t = setTimeout(() => expireItem(id, bad), lifespan)
    itemTimers.current.set(id, t)
  }

  function removeItem(id) {
    const t = itemTimers.current.get(id)
    if (t) {
      clearTimeout(t)
      itemTimers.current.delete(id)
    }
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function expireItem(id, bad) {
    if (gameOverRef.current) return
    itemTimers.current.delete(id)
    setItems((prev) => prev.filter((it) => it.id !== id))
    if (!bad) {
      // A good item was missed - costs a life.
      missedRef.current += 1
      loseLife()
    }
    // Bad items expiring harmlessly is correct play - no penalty.
  }

  function loseLife() {
    if (gameOverRef.current) return
    livesRef.current -= 1
    setLives(livesRef.current)
    if (livesRef.current <= 0) {
      endGame()
    }
  }

  function handleChop(item) {
    if (gameOverRef.current) return
    removeItem(item.id)

    if (item.bad) {
      loseLife()
      return
    }

    choppedRef.current += 1
    scoreRef.current += pointsFor(levelRef.current)
    setScore(scoreRef.current)

    if (choppedRef.current % LEVEL_UP_EVERY === 0 && levelRef.current < MAX_LEVEL) {
      levelRef.current += 1
      setLevel(levelRef.current)
      setLevelBanner(true)
      setTimeout(() => setLevelBanner(false), 1100)
    }
  }

  function endGame() {
    gameOverRef.current = true
    setGameOver(true)
    clearTimeout(spawnTimer.current)
    itemTimers.current.forEach((t) => clearTimeout(t))
    itemTimers.current.clear()
    setItems([])
  }

  function handleFinish() {
    onGameOver({
      score: scoreRef.current,
      maxLevel: levelRef.current,
      chopped: choppedRef.current,
      missed: missedRef.current,
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

      {levelBanner && <div className="mg-level-banner">Level up! Things just got faster.</div>}

      <div className="mg-game-board" style={{ width: BOARD_W, height: BOARD_H }}>
        <div className="mg-cutting-line" />
        {items.map((item) => (
          <button
            key={item.id}
            className={`mg-veggie ${item.bad ? 'bad' : ''}`}
            style={{ left: item.x, top: item.y }}
            onClick={() => handleChop(item)}
            aria-label={item.bad ? 'decoy - avoid chopping' : 'chop this'}
          >
            {item.emoji}
          </button>
        ))}

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
        Chop the vegetables before they disappear. Avoid the rocks and bombs - chopping those costs a life, same as
        letting a vegetable slip past you. It gets faster every {LEVEL_UP_EVERY} chops.
      </p>
    </div>
  )
}
