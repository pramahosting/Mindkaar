import React, { createContext, useContext, useState } from 'react'
import { getStoredUser } from './api.js'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [profile, setProfile] = useState(null)
  const [scenario, setScenario] = useState(null) // { primary, candidates }
  const [questions, setQuestions] = useState(null)
  const [gameConfig, setGameConfig] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  const resetFlow = () => {
    setProfile(null)
    setScenario(null)
    setQuestions(null)
    setGameConfig(null)
    setLastResult(null)
  }

  return (
    <AppCtx.Provider
      value={{
        user, setUser,
        profile, setProfile,
        scenario, setScenario,
        questions, setQuestions,
        gameConfig, setGameConfig,
        lastResult, setLastResult,
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
