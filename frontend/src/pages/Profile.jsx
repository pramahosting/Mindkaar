import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'

export default function Profile() {
  const { setProfile, setScenario, setQuestions } = useApp()
  const navigate = useNavigate()

  const [age, setAge] = useState('')
  const [mood, setMood] = useState('')
  const [sleepHours, setSleepHours] = useState(7)
  const [stressLevel, setStressLevel] = useState(5)
  const [support, setSupport] = useState('')
  const [goals, setGoals] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const profilePayload = {
      age: age ? Number(age) : null,
      mood: mood || null,
      sleepHours: Number(sleepHours),
      stressLevel: Number(stressLevel),
      support: support || null,
      goals: goals || null,
    }

    try {
      await api.saveProfile(profilePayload)
      setProfile(profilePayload)

      // (b) identify a suitable mental scenario from the profile
      const scenarioData = await api.getScenario(profilePayload)
      setScenario(scenarioData)

      // (c) generate questions for the identified scenario
      const questionsData = await api.getQuestions(profilePayload, scenarioData.primary.id)
      setQuestions(questionsData.questions)

      navigate('/scenario')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <h1>Tell us about yourself</h1>
      <p className="mg-subtitle">
        A few quick questions so we can find the right scenario and coping exercise for you right now.
      </p>

      {error && <div className="mg-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mg-field">
          <label>Age (optional)</label>
          <input type="number" min="10" max="110" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 29" />
        </div>

        <div className="mg-field">
          <label>How would you describe your current mood?</label>
          <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="e.g. tired, on edge, restless..." />
        </div>

        <div className="mg-field">
          <label>Average sleep hours per night: <span className="mg-range-value">{sleepHours}h</span></label>
          <input type="range" min="2" max="10" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
        </div>

        <div className="mg-field">
          <label>Current stress level: <span className="mg-range-value">{stressLevel}/10</span></label>
          <input type="range" min="1" max="10" value={stressLevel} onChange={(e) => setStressLevel(e.target.value)} />
        </div>

        <div className="mg-field">
          <label>How would you describe your support system?</label>
          <textarea rows={2} value={support} onChange={(e) => setSupport(e.target.value)} placeholder="e.g. a few close friends, mostly on my own..." />
        </div>

        <div className="mg-field">
          <label>What are you hoping to work on right now?</label>
          <textarea rows={2} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. feeling calmer at work, sleeping better..." />
        </div>

        <button className="mg-btn" disabled={loading}>
          {loading ? <span className="mg-spinner" /> : 'Find my scenario'}
        </button>
      </form>
    </Layout>
  )
}
