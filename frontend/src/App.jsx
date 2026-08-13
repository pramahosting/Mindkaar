import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './AppContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'
import Scenario from './pages/Scenario.jsx'
import GameSelect from './pages/GameSelect.jsx'
import Session from './pages/Session.jsx'
import Results from './pages/Results.jsx'
import SimulationSelect from './pages/SimulationSelect.jsx'
import SimulationRun from './pages/SimulationRun.jsx'
import SimulationResults from './pages/SimulationResults.jsx'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Landing />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scenario"
          element={
            <ProtectedRoute>
              <Scenario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games"
          element={
            <ProtectedRoute>
              <GameSelect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session"
          element={
            <ProtectedRoute>
              <Session />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation"
          element={
            <ProtectedRoute>
              <SimulationSelect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation/:sessionId"
          element={
            <ProtectedRoute>
              <SimulationRun />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation/:sessionId/results"
          element={
            <ProtectedRoute>
              <SimulationResults />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  )
}
