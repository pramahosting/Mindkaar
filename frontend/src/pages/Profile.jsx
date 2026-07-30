import React, { useEffect, useState } from 'react'
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
  const { setProfile, setScenario, setQuestions, intake, setIntake, intakeEntryStep, setIntakeEntryStep } = useApp()
  const navigate = useNavigate()

  const [step, setStep] = useState(intake ? intakeEntryStep : 'context')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Step 1: context (open-ended, comes first) ──
  const [age, setAge] = useState(intake?.age ?? '')
  const [familyProfile, setFamilyProfile] = useState(intake?.familyProfile ?? '')
  const [education, setEducation] = useState(intake?.education ?? '')
  const [workStatus, setWorkStatus] = useState(intake?.workStatus ?? '')
  const [children, setChildren] = useState(intake?.children ?? '')
  const [mood, setMood] = useState(intake?.mood ?? '')
  const [sleepHours, setSleepHours] = useState(intake?.sleepHours ?? 7)
  const [support, setSupport] = useState(intake?.support ?? '')
  const [goals, setGoals] = useState(intake?.goals ?? '')

  // ── Step 2: targeted Likert items ──
  const [items, setItems] = useState(intake?.items ?? [])
  const [scale, setScale] = useState(intake?.scale ?? [])
  const [answers, setAnswers] = useState(intake?.answers ?? {})
  const [recommendedLabels, setRecommendedLabels] = useState(intake?.recommendedLabels ?? [])

  // Reset the entry-step flag once consumed, so a normal fresh visit to
  // /profile later still defaults to the context step.
  useEffect(() => {
    setIntakeEntryStep('context')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If there's no in-session intake state yet (e.g. arriving here for the
  // first time this session, such as login -> games -> "back to my
  // answers"), pull the person's last submitted answers from the server
  // so the form starts pre-filled instead of blank.
  const [prefilling, setPrefilling] = useState(!intake)

  useEffect(() => {
    if (intake) {
      setPrefilling(false)
      return
    }
    let cancelled = false

    api
      .getLatestAssessment()
      .then(async (latest) => {
        if (cancelled || !latest.exists) return

        setAge(latest.age ?? '')
        setFamilyProfile(latest.familyProfile ?? '')
        setEducation(latest.education ?? '')
        setWorkStatus(latest.workStatus ?? '')
        setChildren(latest.children ?? '')
        setMood(latest.mood ?? '')
        setSleepHours(latest.sleepHours ?? 7)
        setSupport(latest.support ?? '')
        setGoals(latest.goals ?? '')

        let prefilledItems = []
        let prefilledScale = []
        if (latest.categories && latest.categories.length > 0) {
          const itemsData = await api.getAssessmentItems(latest.categories)
          if (cancelled) return
          prefilledItems = itemsData.items
          prefilledScale = itemsData.scale
          setItems(itemsData.items)
          setScale(itemsData.scale)
          setAnswers(latest.assessment)
          setRecommendedLabels(latest.categories.map((code) => CATEGORY_LABELS[code] || code))
        }

        setIntake({
          age: latest.age ?? '',
          familyProfile: latest.familyProfile ?? '',
          education: latest.education ?? '',
          workStatus: latest.workStatus ?? '',
          children: latest.children ?? '',
          mood: latest.mood ?? '',
          sleepHours: latest.sleepHours ?? 7,
          support: latest.support ?? '',
          goals: latest.goals ?? '',
          items: prefilledItems,
          scale: prefilledScale,
          answers: latest.assessment,
          recommendedLabels: latest.categories.map((code) => CATEGORY_LABELS[code] || code),
        })
      })
      .catch(() => {
        // No prior assessment reachable/found - just proceed with a blank form.
      })
      .finally(() => {
        if (!cancelled) setPrefilling(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      // Keep any answers already held (e.g. pre-filled from a prior
      // submission) for questions that are still part of the new set,
      // instead of wiping everything back to blank every time Continue
      // is pressed.
      const preservedAnswers = {}
      itemsData.items.forEach((item) => {
        if (answers[item.code] !== undefined) {
          preservedAnswers[item.code] = answers[item.code]
        }
      })

      setItems(itemsData.items)
      setScale(itemsData.scale)
      setRecommendedLabels(triage.recommended.map((code) => CATEGORY_LABELS[code] || code))
      setAnswers(preservedAnswers)
      setStep('likert')

      setIntake({
        age, familyProfile, education, workStatus, children, mood, sleepHours, support, goals,
        items: itemsData.items,
        scale: itemsData.scale,
        recommendedLabels: triage.recommended.map((code) => CATEGORY_LABELS[code] || code),
        answers: preservedAnswers,
      })
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
    setAnswers((prev) => {
      const next = { ...prev, [itemCode]: value }
      setIntake((prevIntake) => (prevIntake ? { ...prevIntake, answers: next } : prevIntake))
      return next
    })
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
      console.log(profilePayload)

      const questionsData = await api.getQuestions(profilePayload, scenarioData.primary.id)
      setQuestions(questionsData.questions)

      navigate('/scenario', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1 UI: context questions ──
  if (prefilling) {
    return (
      <Layout>
        <div className="mg-loading-screen">
          <div className="mg-spinner" style={{ borderColor: 'rgba(0,199,183,.25)', borderTopColor: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your details…</p>
        </div>
      </Layout>
    )
  }

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
