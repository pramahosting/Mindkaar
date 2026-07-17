import React, { useEffect, useRef, useState } from 'react'

const MAX_LIVES = 3
const MAX_LEVEL = 6
const LEVEL_UP_EVERY = 5

// bin: 'release' = worth letting go of right now, 'engage' = worth acting on.
const THOUGHTS = [
  { text: 'Something someone said that you can\'t change now', bin: 'release' },
  { text: 'A decision that\'s already been made', bin: 'release' },
  { text: 'Traffic being slow this morning', bin: 'release' },
  { text: 'The weather ruining weekend plans', bin: 'release' },
  { text: 'An old argument that\'s already resolved', bin: 'release' },
  { text: 'What a stranger might be thinking about you', bin: 'release' },
  { text: 'A typo you already fixed', bin: 'release' },
  { text: 'Something that happened years ago', bin: 'release' },
  { text: 'A rumor you can\'t verify', bin: 'release' },
  { text: 'A mistake you\'ve already learned from', bin: 'release' },

  { text: 'An email you keep forgetting to send', bin: 'engage' },
  { text: 'A conversation you\'ve been avoiding', bin: 'engage' },
  { text: 'A bill that\'s due this week', bin: 'engage' },
  { text: 'A task with a deadline tomorrow', bin: 'engage' },
  { text: 'A friend you haven\'t checked on in a while', bin: 'engage' },
  { text: 'A habit you want to start today', bin: 'engage' },
  { text: 'Booking an appointment you need', bin: 'engage' },
  { text: 'Replying to a message waiting for you', bin: 'engage' },
  { text: 'A small chore that\'s been piling up', bin: 'engage' },
  { text: 'Setting a boundary you\'ve been putting off', bin: 'engage' },
]

function windowMsFor(level) {
  return Math.max(3200 - level * 340, 1300)
}
function pointsFor(level) {
  return 12 + level * 6
}

export default function ThoughtSortingGame({ onGameOver, startingLevel = 1 }) {
  const [level, setLevel] = useState(startingLevel)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [levelBanner, setLevelBanner] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [current, setCurrent] = useState(null)
  const [barKey, setBarKey] = useState(0)
  const [flashWrong, setFlashWrong] = useState(false)

  const levelRef = useRef(startingLevel)
  const livesRef = useRef(MAX_LIVES)
  const hitRef = useRef(0)
  const missRef = useRef(0)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const handledRef = useRef(true)
  const lastTextRef = useRef(null)
  const roundTimer = useRef(null)

  useEffect(() => {
    nextRound()
    return () => clearTimeout(roundTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pickThought() {
    let choice
    do {
      choice = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]
    } while (choice.text === lastTextRef.current && THOUGHTS.length > 1)
    lastTextRef.current = choice.text
    return choice
  }

  function nextRound() {
    if (gameOverRef.current) return
    const thought = pickThought()
    setCurrent(thought)
    handledRef.current = false
    setBarKey((k) => k + 1)

    const windowMs = windowMsFor(levelRef.current)
    roundTimer.current = setTimeout(() => resolve(null), windowMs)
  }

  function resolve(chosenBin) {
    if (gameOverRef.current || handledRef.current) return
    handledRef.current = true
    clearTimeout(roundTimer.current)

    const correct = chosenBin !== null && current && chosenBin === current.bin

    if (correct) {
      hitRef.current += 1
      scoreRef.current += pointsFor(levelRef.current)
      setScore(scoreRef.current)

      if (hitRef.current % LEVEL_UP_EVERY === 0 && levelRef.current < MAX_LEVEL) {
        levelRef.current += 1
        setLevel(levelRef.current)
        setLevelBanner(true)
        setTimeout(() => setLevelBanner(false), 1100)
      }
      nextRound()
    } else {
      missRef.current += 1
      if (chosenBin !== null) {
        setFlashWrong(true)
        setTimeout(() => setFlashWrong(false), 350)
      }
      loseLife()
    }
  }

  function loseLife() {
    if (gameOverRef.current) return
    livesRef.current -= 1
    setLives(livesRef.current)
    if (livesRef.current <= 0) {
      endGame()
    } else {
      setTimeout(nextRound, 500)
    }
  }

  function endGame() {
    gameOverRef.current = true
    setGameOver(true)
    clearTimeout(roundTimer.current)
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

      {levelBanner && <div className="mg-level-banner">Level up! Less time to decide.</div>}

      <div className="mg-sort-board">
        <div className="mg-sort-timerbar-track">
          <div key={barKey} className="mg-sort-timerbar-fill" style={{ animationDuration: `${windowMsFor(level)}ms` }} />
        </div>

        <div className={`mg-sort-thought ${flashWrong ? 'wrong' : ''}`}>{current ? current.text : ''}</div>

        <div className="mg-sort-buttons">
          <button className="mg-sort-btn release" onClick={() => resolve('release')}>
            🌬️ Let it go
          </button>
          <button className="mg-sort-btn engage" onClick={() => resolve('engage')}>
            ✅ Act on it
          </button>
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
        Sort each thought before the bar runs out - is it worth acting on, or worth letting go of right now?
        The window shortens every {LEVEL_UP_EVERY} correct sorts.
      </p>
    </div>
  )
}
