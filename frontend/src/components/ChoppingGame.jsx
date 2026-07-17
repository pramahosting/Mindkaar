import React, { useEffect, useRef, useState } from 'react'

const GOOD_ITEMS = ['🥕', '🍅', '🥒', '🧅', '🌶️', '🥦', '🌽', '🍆']
const ROCK_EMOJI = '🪨'
const BOMB_EMOJI = '💣'
const BOMB_FLASH_EMOJI = '💥'

const BOARD_W = 640
const BOARD_H = 380
const ITEM_SIZE = 54
const MAX_LIVES = 3
const MAX_LEVEL = 6
const LEVEL_UP_EVERY = 6 // chopped items per level
const ROCK_LIFE_PENALTY = 1

function spawnIntervalFor(level) {
  return Math.max(1500 - level * 170, 480)
}
function lifespanFor(level) {
  return Math.max(1900 - level * 200, 700)
}
function rockChanceFor(level) {
  // Stays fairly rare and grows slowly - a minor, steady distraction.
  return Math.min(0.07 + level * 0.015, 0.16)
}
function bombChanceFor(level) {
  // Ramps up much faster than the rock - bombs are what actually make
  // higher levels demand real attention and quick judgment.
  return Math.min(0.04 + level * 0.05, 0.32)
}
function pointsFor(level) {
  return 10 + level * 5
}

function pickKind(level) {
  const roll = Math.random()
  const bombChance = bombChanceFor(level)
  const rockChance = rockChanceFor(level)
  if (roll < bombChance) return 'bomb'
  if (roll < bombChance + rockChance) return 'rock'
  return 'good'
}

export default function ChoppingGame({ onGameOver, startingLevel = 1 }) {
  const [items, setItems] = useState([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [level, setLevel] = useState(startingLevel)
  const [levelBanner, setLevelBanner] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [gameOverReason, setGameOverReason] = useState(null) // 'bomb' | 'lives'
  const [explodingId, setExplodingId] = useState(null)
  const [boardFlash, setBoardFlash] = useState(false)

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
    const kind = pickKind(levelRef.current) // 'good' | 'rock' | 'bomb'
    const emoji = kind === 'bomb' ? BOMB_EMOJI : kind === 'rock' ? ROCK_EMOJI : GOOD_ITEMS[Math.floor(Math.random() * GOOD_ITEMS.length)]
    const id = ++idCounter.current
    const x = Math.random() * (BOARD_W - ITEM_SIZE - 20) + 10
    const y = Math.random() * (BOARD_H - ITEM_SIZE - 20) + 10
    const lifespan = lifespanFor(levelRef.current)

    setItems((prev) => [...prev, { id, emoji, kind, x, y, lifespan }])

    const t = setTimeout(() => expireItem(id, kind), lifespan)
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

  function expireItem(id, kind) {
    if (gameOverRef.current) return
    itemTimers.current.delete(id)
    setItems((prev) => prev.filter((it) => it.id !== id))
    if (kind === 'good') {
      // A good item was missed - costs a life.
      missedRef.current += 1
      loseLife(1)
    }
    // Rocks/bombs expiring harmlessly is correct play - no penalty.
  }

  function loseLife(amount) {
    if (gameOverRef.current) return
    livesRef.current = Math.max(0, livesRef.current - amount)
    setLives(livesRef.current)
    if (livesRef.current <= 0) {
      endGame()
    }
  }

  function handleChop(item) {
    if (gameOverRef.current) return

    if (item.kind === 'bomb') {
      setExplodingId(item.id)
      setBoardFlash(true)
      clearTimeout(spawnTimer.current)
      itemTimers.current.forEach((t) => clearTimeout(t))
      itemTimers.current.clear()
      setTimeout(() => {
        endGame('bomb')
      }, 380)
      return
    }

    removeItem(item.id)

    if (item.kind === 'rock') {
      loseLife(ROCK_LIFE_PENALTY)
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

  function endGame(reason = 'lives') {
    gameOverRef.current = true
    setGameOver(true)
    setGameOverReason(reason)
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

      {levelBanner && <div className="mg-level-banner">Level up! More bombs, less time to react.</div>}

      <div className={`mg-game-board ${boardFlash ? 'blast-flash' : ''}`} style={{ width: BOARD_W, height: BOARD_H }}>
        <div className="mg-cutting-line" />
        {items.map((item) => (
          <button
            key={item.id}
            className={`mg-veggie ${item.kind !== 'good' ? item.kind : ''} ${explodingId === item.id ? 'exploding' : ''}`}
            style={{ left: item.x, top: item.y }}
            onClick={() => handleChop(item)}
            aria-label={item.kind === 'bomb' ? 'bomb - avoid chopping, ends the game instantly' : item.kind === 'rock' ? 'rock - avoid chopping' : 'chop this'}
          >
            {explodingId === item.id ? BOMB_FLASH_EMOJI : item.emoji}
          </button>
        ))}

        {gameOver && (
          <div className="mg-game-overlay">
            {gameOverReason === 'bomb' ? (
              <>
                <h2 style={{ color: '#fff' }}>💥 Boom!</h2>
                <p>You hit a bomb - one wrong click and it's over. Final score: {score}, level {level}.</p>
              </>
            ) : (
              <>
                <h2 style={{ color: '#fff' }}>Game Over</h2>
                <p>You reached level {level} with a final score of {score}.</p>
              </>
            )}
            <button className="mg-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={handleFinish}>
              See my results
            </button>
          </div>
        )}
      </div>

      <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 500 }}>
        Chop the vegetables before they disappear. Avoid the rocks (-1 life) and especially the bombs - one bomb
        ends the run instantly, so staying quick and attentive really matters as they show up more at higher levels.
        It gets faster every {LEVEL_UP_EVERY} chops.
      </p>
    </div>
  )
}
