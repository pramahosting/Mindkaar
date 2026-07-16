import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setToken, setStoredUser } from '../api.js'
import { useApp } from '../AppContext.jsx'
import Layout from '../components/Layout.jsx'

export default function Register() {
  const [name, setName] = useState('')
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
      const data = await api.register({ name, email, password })
      setToken(data.access_token)
      setStoredUser(data.user)
      setUser(data.user)
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <h1>Create your account</h1>
      <p className="mg-subtitle">Join Mind Gym to start your personalized session.</p>

      {error && <div className="mg-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mg-field">
          <label>Full name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="mg-field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="mg-field">
          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <button className="mg-btn" disabled={loading}>
          {loading ? <span className="mg-spinner" /> : 'Create account'}
        </button>
      </form>

      <div className="mg-link-row">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </Layout>
  )
}
