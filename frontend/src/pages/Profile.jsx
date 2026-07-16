import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'

const CATEGORY_LABELS = {
  stress: 'Stress',
  anxiety: 'Anxiety',
  conflict: 'Conflict',
  unrest: 'Unrest',
  burnout: 'Burnout',
  loneliness: 'Loneliness',
}

const FAMILY_OPTIONS = ['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed', 'Prefer not to say']
const EDUCATION_OPTIONS = ["High school", "Some college", "Bachelor's degree", 'Graduate degree', 'Other']
const WORK_OPTIONS = ['Employed full-time', 'Employed part-time', 'Self-employed', 'Student', 'Unemployed', 'Retired']
const CHILDREN_OPTIONS = ['None', '1', '2', '3+']

export default function Profile() {
  const { setProfile, setScenario, setQuestions } = useApp()
  const navigate = useNavigate()

  const [step, setStep] = useState('context') // 'context' | 'likert'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Step 1: context (open-ended, comes first) ──
  const [age, setAge] = useState('')
  const [familyProfile, setFamilyProfile] = useState('')
  const [education, setEducation] = useState('')
  const [workStatus, setWorkStatus] = useState('')
  const [children, setChildren] = useState('')
  const [mood, setMood] = useState('')
  const [sleepHours, setSleepHours] = useState(7)
  const [support, setSupport] = useState('')
  const [goals, setGoals] = useState('')

  // ── Step 2: targeted Likert items ──
  const [items, setItems] = useState([])
  const [scale, setScale] = useState([])
  const [answers, setAnswers] = useState({})
  const [recommendedLabels, setRecommendedLabels] = useState([])

  function contextPayload() {
    return {
      age: age ? Number(age) : null,
      familyProfile: familyProfile || null,
      education: education || null,
      workStatus: workStatus || null,
      children: children || null,
      mood: mood || null,
      sleepHours: Number(sleepHours),
      support: support || null,
      goals: goals || null,
      assessment: {},
    }
  }

  async function handleContextSubmit(e) {
    e.preventDefault()
    if (!mood.trim()) {
      setError('Please describe a little about how you\'ve been feeling - it helps us pick the right questions next.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = contextPayload()
      const triage = await api.triage(payload)
      const itemsData = await api.getAssessmentItems(triage.recommended)

      setItems(itemsData.items)
      setScale(itemsData.scale)
      setRecommendedLabels(triage.recommended.map((code) => CATEGORY_LABELS[code] || code))
      setAnswers({})
      setStep('likert')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const grouped = items.reduce((acc, item) => {
    ;(acc[item.category] = acc[item.category] || []).push(item)
    return acc
  }, {})

  const totalItems = items.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = totalItems > 0 && answeredCount === totalItems

  function setAnswer(itemCode, value) {
    setAnswers((prev) => ({ ...prev, [itemCode]: value }))
  }

  async function handleLikertSubmit(e) {
    e.preventDefault()
    if (!allAnswered) {
      setError('Please answer every question so the scenario match is accurate.')
      return
    }
    setError('')
    setLoading(true)

    const profilePayload = { ...contextPayload(), assessment: answers }

    try {
      const scenarioData = await api.saveProfile(profilePayload)
      setProfile(profilePayload)
      setScenario(scenarioData)

      const questionsData = await api.getQuestions(profilePayload, scenarioData.primary.id)
      setQuestions(questionsData.questions)

      navigate('/games')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1 UI: context questions ──
  if (step === 'context') {
    return (
      <Layout wide>
        <h1>Let's start with a bit about you</h1>
        <p className="mg-subtitle">
          A few open-ended questions first - this helps us ask you the right follow-up questions next, instead of
          showing you everything at once.
        </p>

        {error && <div className="mg-error">{error}</div>}

        <form onSubmit={handleContextSubmit}>
          <div className="mg-two-col">
            <div className="mg-field">
              <label>Age</label>
              <input type="number" min="10" max="110" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 29" />
            </div>
            <div className="mg-field">
              <label>Family profile</label>
              <select value={familyProfile} onChange={(e) => setFamilyProfile(e.target.value)}>
                <option value="">Select...</option>
                {FAMILY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="mg-field">
              <label>Education</label>
              <select value={education} onChange={(e) => setEducation(e.target.value)}>
                <option value="">Select...</option>
                {EDUCATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="mg-field">
              <label>Work status</label>
              <select value={workStatus} onChange={(e) => setWorkStatus(e.target.value)}>
                <option value="">Select...</option>
                {WORK_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="mg-field">
              <label>Children</label>
              <select value={children} onChange={(e) => setChildren(e.target.value)}>
                <option value="">Select...</option>
                {CHILDREN_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="mg-field">
              <label>Average sleep hours per night: <span className="mg-range-value">{sleepHours}h</span></label>
              <input type="range" min="2" max="10" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
            </div>
          </div>

          <div className="mg-field">
            <label>How have you been feeling lately? Describe in your own words.</label>
            <textarea
              rows={4}
              required
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. I've been worrying about work a lot, having trouble switching off in the evenings, snapping at small things..."
            />
          </div>
          <div className="mg-field">
            <label>How would you describe your support system? (optional)</label>
            <textarea rows={2} value={support} onChange={(e) => setSupport(e.target.value)} placeholder="e.g. a few close friends, mostly on my own..." />
          </div>
          <div className="mg-field">
            <label>What are you hoping to work on right now? (optional)</label>
            <textarea rows={2} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. feeling calmer at work, sleeping better..." />
          </div>

          <button className="mg-btn" disabled={loading}>
            {loading ? <span className="mg-spinner" /> : 'Continue'}
          </button>
        </form>
      </Layout>
    )
  }

  // ── Step 2 UI: targeted Likert questions ──
  return (
    <Layout wide>
      <h1>A closer look at how you've been</h1>
      <p className="mg-subtitle">
        Based on what you shared, we're focusing on: <strong>{recommendedLabels.join(', ')}</strong>. Just this
        short, focused set - not everything at once.
      </p>

      {error && <div className="mg-error">{error}</div>}

      <form onSubmit={handleLikertSubmit}>
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} className="mg-assessment-section">
            <div className="mg-assessment-section-header">
              <span className="mg-badge">{CATEGORY_LABELS[category]}</span>
            </div>
            <p className="mg-assessment-intro">Over the past two weeks, how often have you...</p>

            {categoryItems.map((item) => (
              <div key={item.code} className="mg-likert-row">
                <p className="mg-likert-text">{item.text}?</p>
                <div className="mg-likert-scale">
                  {scale.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`mg-likert-option ${answers[item.code] === opt.value ? 'selected' : ''}`}
                      onClick={() => setAnswer(item.code, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="mg-assessment-progress-bar">
          <div className="mg-assessment-progress-fill" style={{ width: totalItems ? `${(answeredCount / totalItems) * 100}%` : '0%' }} />
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          {answeredCount} of {totalItems} answered
        </p>

        <div className="mg-btn-row">
          <button type="button" className="mg-btn mg-btn-outline" onClick={() => setStep('context')}>
            Back
          </button>
          <button className="mg-btn" disabled={loading || !allAnswered}>
            {loading ? <span className="mg-spinner" /> : 'Find my scenario'}
          </button>
        </div>
      </form>
    </Layout>
  )
}
