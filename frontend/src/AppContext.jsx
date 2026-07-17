import React, { createContext, useContext, useState } from 'react'
import { getStoredUser } from './api.js'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [profile, setProfile] = useState(null)
  const [scenario, setScenario] = useState(null) // { primary, candidates }
  const [questions, setQuestions] = useState(null)
  const [scenarioGames, setScenarioGames] = useState(null) // list from /scenario-games/:scenario
  const [selectedGame, setSelectedGame] = useState(null) // one entry from scenarioGames + startingLevel/wasRestart
  const [lastResult, setLastResult] = useState(null)

  // Preserves the intake form's in-progress/last-submitted state so
  // navigating back from the game page to "change my answers" restores
  // where the person left off instead of starting blank.
  const [intake, setIntake] = useState(null)
  const [intakeEntryStep, setIntakeEntryStep] = useState('context') // 'context' | 'likert'

  const resetFlow = () => {
    setProfile(null)
    setScenario(null)
    setQuestions(null)
    setScenarioGames(null)
    setSelectedGame(null)
    setLastResult(null)
    setIntake(null)
    setIntakeEntryStep('context')
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
