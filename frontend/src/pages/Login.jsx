import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setToken, setStoredUser } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useApp()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login({ email, password })
      setToken(data.access_token)
      setStoredUser(data.user)
      // Setting user here causes the surrounding PublicOnlyRoute to pick up
      // the change, check /me/status, and redirect to /games or /profile
      // as appropriate - no need to duplicate that logic here.
      setUser(data.user)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <Layout>
      <h1>Welcome back</h1>
      <p className="mg-subtitle">Log in to continue your Mind Gym journey.</p>

      {error && <div className="mg-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mg-field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="mg-field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="mg-btn" disabled={loading}>
          {loading ? <span className="mg-spinner" /> : 'Log in'}
        </button>
      </form>

      <div className="mg-link-row">
        Don't have an account? <Link to="/register">Sign up</Link>
      </div>
    </Layout>
  )
}
