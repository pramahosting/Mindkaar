import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'
import SimAvatar from '../components/SimAvatar.jsx'
import SimMicButton from '../components/SimMicButton.jsx'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis.js'
import { inferAvatarGender } from '../lib/avatarGender.js'

export default function SimulationRun() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { profile } = useApp()

  // Decided once per session from the person's own first-page "how have
  // you been feeling" text (mother -> female, father -> male, otherwise a
  // stable pick) - see src/lib/avatarGender.js. Computed once so it never
  // flips mid-conversation.
  const [avatarGender] = useState(() => inferAvatarGender(profile?.mood, sessionId))

  const [scenario, setScenario] = useState(null)
  const [state, setState] = useState('idle')
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [emotion, setEmotion] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(1)
  const [transcript, setTranscript] = useState([])
  const [reviewText, setReviewText] = useState('')
  const [errorBanner, setErrorBanner] = useState(null)
  const [relevanceWarning, setRelevanceWarning] = useState(null)
  const [mode, setMode] = useState('demo')

  const {
    micState,
    transcript: liveTranscript,
    interim,
    errorMessage: micError,
    isSupported: micSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  const { speak, stop: stopSpeaking, isSpeaking, isMuted, toggleMute, replay, isSupported: ttsSupported } = useSpeechSynthesis(avatarGender)

  const loadedSessionIdRef = useRef(null)
  const isMountedRef = useRef(true)
  const timeoutsRef = useRef([])

  function scheduleTimeout(fn, delay) {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id)
      if (!isMountedRef.current) return
      fn()
    }, delay)
    timeoutsRef.current.push(id)
    return id
  }

  // Runs once on unmount (e.g. the user navigates away, including via the
  // browser back/forward buttons): stops any in-flight speech and cancels
  // any pending timers so they can never fire a navigate() or setState()
  // after the user has already left this page.
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
      stopListening()
      stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Reloads whenever sessionId changes (e.g. navigating back/forward
    // between two different simulation sessions) instead of only once -
    // otherwise the page would keep showing the previous session's data
    // forever while the URL silently changed underneath it.
    if (loadedSessionIdRef.current === sessionId) return
    loadedSessionIdRef.current = sessionId

    // Reset visible state immediately so the previous session's content
    // doesn't linger on screen while the new one loads.
    setScenario(null)
    setEmotion(null)
    setErrorBanner(null)
    setRelevanceWarning(null)
    setReviewText('')
    setState('idle')

    ;(async () => {
      try {
        const session = await api.getSimSession(sessionId)
        if (!isMountedRef.current || loadedSessionIdRef.current !== sessionId) return

        setScenario(session.scenario)
        setEmotion(session.emotion)
        setQuestionIndex(session.question_index)
        setTotalQuestions(session.total_questions)
        setMode(session.mode)
        setTranscript(session.transcript)

        if (session.status === 'completed') {
          navigate(`/simulation/${sessionId}/results`, { replace: true })
          return
        }

        const question = session.current_question || session.scenario.opening_line
        setCurrentQuestion(question)
        setState('ai_speaking')
        speak(question)
        scheduleTimeout(() => setState('waiting_for_user'), 300)
      } catch (err) {
        if (!isMountedRef.current || loadedSessionIdRef.current !== sessionId) return
        setErrorBanner(err instanceof ApiError ? err.message : 'Failed to load this simulation session.')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (micState === 'listening') setState('listening')
    if (micState === 'complete') {
      setReviewText((liveTranscript || '').trim())
      setState('user_review')
    }
    if (micState === 'error' && micError) {
      setErrorBanner(micError)
    }
  }, [micState, liveTranscript, micError])

  function handleStartListening() {
    setErrorBanner(null)
    setRelevanceWarning(null)
    resetTranscript()
    startListening()
  }

  async function handleSubmit() {
    const text = reviewText.trim()
    if (!text) {
      setErrorBanner('Please say or type a response before submitting.')
      return
    }
    setState('submitting')
    setErrorBanner(null)
    setRelevanceWarning(null)

    try {
      setState('ai_analyzing')
      const res = await api.respondToSim(sessionId, text)

      setTranscript((prev) => {
        const next = [
          ...prev,
          { sender: 'user', message: text, timestamp: new Date().toISOString() },
          { sender: 'ai', message: res.character_response, emotion: res.emotion.primary_emotion, timestamp: new Date().toISOString() },
        ]
        if (res.should_continue && res.next_question) {
          next.push({ sender: 'ai', message: res.next_question, emotion: res.emotion.primary_emotion, timestamp: new Date().toISOString() })
        }
        return next
      })
      setEmotion(res.emotion)
      setMode(res.mode)
      setQuestionIndex(res.question_index)
      setTotalQuestions(res.total_questions)

      if (!res.is_relevant) {
        setRelevanceWarning(
          "Your response doesn't appear to address the current question. The character noticed too - take another look at what was asked and try again."
        )
      }

      setReviewText('')
      resetTranscript()

      if (!res.should_continue || !res.next_question) {
        setState('ai_speaking')
        speak(res.character_response)
        scheduleTimeout(async () => {
          try {
            await api.completeSimulation(sessionId)
          } finally {
            if (isMountedRef.current) navigate(`/simulation/${sessionId}/results`)
          }
        }, 1200)
        return
      }

      setCurrentQuestion(res.next_question)
      setState('ai_speaking')
      speak(`${res.character_response} ${res.next_question}`)
      scheduleTimeout(() => setState('waiting_for_user'), 300)
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : 'Something went wrong processing your response.')
      setState('waiting_for_user')
    }
  }

  if (errorBanner && !scenario) {
    return (
      <Layout>
        <p className="mg-error">{errorBanner}</p>
      </Layout>
    )
  }

  if (!scenario || !emotion) {
    return (
      <Layout>
        <div className="mg-loading-screen">
          <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading simulation…</p>
        </div>
      </Layout>
    )
  }

  const isAiSpeaking = state === 'ai_speaking' && isSpeaking
  const micDisabled = state === 'ai_speaking' || state === 'submitting' || state === 'ai_analyzing'
  const progressPct = (Math.min(questionIndex + 1, totalQuestions) / totalQuestions) * 100

  return (
    <Layout wide>
      <div className="sim-run-topbar">
        <div className="sim-run-topbar-actions" style={{ marginLeft: 'auto' }}>
          <span className="sim-mode-badge">{mode === 'groq' ? 'AI mode' : 'Demo mode'}</span>
          {ttsSupported && (
            <button className="mg-btn-outline sim-pill-btn" onClick={toggleMute}>
              {isMuted ? 'Unmute voice' : 'Mute voice'}
            </button>
          )}
          <button className="mg-btn-outline sim-pill-btn" onClick={replay}>Replay</button>
        </div>
      </div>

      {errorBanner && <div className="mg-error">{errorBanner}</div>}
      {relevanceWarning && <div className="sim-warning">{relevanceWarning}</div>}
      {!micSupported && (
        <div className="sim-warning">
          Your browser doesn't support speech recognition. You can still type your response below.
        </div>
      )}

      <div className="sim-run-grid">
        <section className="mg-game-picker-card sim-run-avatar-panel">
          <div>
            <h3 style={{ marginBottom: 2 }}>{scenario.character.name}</h3>
            <p className="sim-run-role">{scenario.character.role}</p>
          </div>
          <div className="sim-avatar-container">
            <SimAvatar
              primaryEmotion={emotion.primary_emotion}
              intensity={emotion.intensity}
              isSpeaking={isAiSpeaking}
              gender={avatarGender}
              seed={scenario.character?.id || scenario.id}
            />
          </div>
          <div className="sim-question-bubble">“{currentQuestion}”</div>
        </section>

        <section className="sim-run-response-col">
          <div className="mg-game-picker-card">
            <p className="mg-badge">Scenario</p>
            <h3 style={{ marginTop: 8 }}>{scenario.title}</h3>
            <p className="mg-game-picker-desc">{scenario.objective}</p>
            <p className="sim-progress-label">
              Question {Math.min(questionIndex + 1, totalQuestions)} of {totalQuestions}
            </p>
            <div className="mg-assessment-progress-bar">
              <div className="mg-assessment-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="mg-game-picker-card">
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Your response</p>
            <div className="sim-response-inner">
              <SimMicButton
                micState={micSupported ? micState : 'error'}
                disabled={micDisabled}
                onStart={handleStartListening}
                onStop={stopListening}
              />

              {micState === 'listening' && <p className="sim-interim">{interim || 'Listening…'}</p>}

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="You said: your transcribed response will appear here (or type it directly)"
                rows={3}
                disabled={micDisabled}
                className="sim-textarea"
              />

              <button
                className="mg-btn"
                onClick={handleSubmit}
                disabled={micDisabled || !reviewText.trim() || state === 'listening'}
              >
                {state === 'ai_analyzing' ? <span className="mg-spinner" /> : 'Submit response'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="mg-game-picker-card sim-transcript-panel">
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Conversation transcript</p>
        <div className="sim-transcript-scroll">
          {transcript.map((m, i) => (
            <div key={i} className={`sim-transcript-line ${m.sender === 'ai' ? 'ai' : 'user'}`}>
              <span className="sim-transcript-sender">{m.sender === 'ai' ? scenario.character.name : 'You'}: </span>
              {m.message}
            </div>
          ))}
        </div>
      </section>
    </Layout>
  )
}
