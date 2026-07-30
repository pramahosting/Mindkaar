import React, { createContext, useContext, useEffect, useState } from 'react'
import { getStoredUser } from './api.js'

const AppCtx = createContext(null)

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [profile, setProfile] = useState(null)

  // scenario, questions, and reflectionAnswers are seeded from localStorage
  // on load and kept in sync with it below, so a page refresh (or coming
  // back later) restores them the same way the backend-saved intake
  // answers are already restored via getLatestAssessment().
  const [scenario, setScenario] = useState(() => readJSON('mg_scenario', null)) // { primary, candidates }
  const [questions, setQuestions] = useState(() => readJSON('mg_questions', null))
  const [reflectionAnswers, setReflectionAnswers] = useState(() => readJSON('mg_reflection_answers', {}))

  const [scenarioGames, setScenarioGames] = useState(null) // list from /scenario-games/:scenario
  const [selectedGame, setSelectedGame] = useState(null) // one entry from scenarioGames + startingLevel/wasRestart
  const [lastResult, setLastResult] = useState(null)

  // Preserves the intake form's in-progress/last-submitted state so
  // navigating back from the game page to "change my answers" restores
  // where the person left off instead of starting blank.
  const [intake, setIntake] = useState(null)
  const [intakeEntryStep, setIntakeEntryStep] = useState('context') // 'context' | 'likert'

  useEffect(() => { writeJSON('mg_scenario', scenario) }, [scenario])
  useEffect(() => { writeJSON('mg_questions', questions) }, [questions])
  useEffect(() => { writeJSON('mg_reflection_answers', reflectionAnswers) }, [reflectionAnswers])

  const resetFlow = () => {
    setProfile(null)
    setScenario(null)
    setQuestions(null)
    setScenarioGames(null)
    setSelectedGame(null)
    setLastResult(null)
    setIntake(null)
    setIntakeEntryStep('context')
    setReflectionAnswers({})
  }

  return (
    <AppCtx.Provider
      value={{
        user, setUser,
        profile, setProfile,
        scenario, setScenario,
        questions, setQuestions,
        scenarioGames, setScenarioGames,
        selectedGame, setSelectedGame,
        lastResult, setLastResult,
        intake, setIntake,
        intakeEntryStep, setIntakeEntryStep,
        reflectionAnswers, setReflectionAnswers,
        resetFlow,
      }}
    >
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
