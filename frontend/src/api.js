// In local dev, app.cmd writes frontend/.env with VITE_API_URL pointing at
// the separately-running backend (e.g. http://localhost:8000). In the
// single-container Docker deployment, frontend and backend are served from
// the same origin, so this defaults to '' (relative requests) when that
// variable isn't set, rather than assuming a separate localhost backend.
const BASE_URL = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('mg_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('mg_token', token)
  else localStorage.removeItem('mg_token')
}

export function getStoredUser() {
  const raw = localStorage.getItem('mg_user')
  return raw ? JSON.parse(raw) : null
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('mg_user', JSON.stringify(user))
  else localStorage.removeItem('mg_user')
}

export class ApiError extends Error {}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const detail = data?.detail
    const message =
      (typeof detail === 'string' && detail) ||
      detail?.error ||
      data?.error ||
      `Request failed (${res.status})`
    throw new ApiError(message)
  }

  return data
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/api/auth/me'),

  saveProfile: (profile) => request('/api/mindgym/profile', { method: 'POST', body: profile }),
  triage: (profile) => request('/api/mindgym/triage', { method: 'POST', body: profile }),
  getAssessmentItems: (categories) =>
    request(`/api/mindgym/assessment${categories && categories.length ? `?categories=${categories.join(',')}` : ''}`),
  getMyStatus: () => request('/api/mindgym/me/status'),
  getLatestAssessment: () => request('/api/mindgym/profile/latest'),
  getQuestions: (profile, scenario) =>
    request('/api/mindgym/questions', { method: 'POST', body: { profile, scenario } }),
  getScenarioGames: (scenario) => request(`/api/mindgym/scenario-games/${encodeURIComponent(scenario)}`),
  submitScore: (payload) => request('/api/mindgym/score', { method: 'POST', body: payload }),

  // ── Run Simulation (voice roleplay) ──
  listSimScenarios: () => request('/api/simulation/scenarios'),
  personalizeSimulation: (payload) => request('/api/simulation/personalize', { method: 'POST', body: payload }),
  startSimulation: (scenarioId) =>
    request('/api/simulation/start', { method: 'POST', body: { scenario_id: scenarioId } }),
  getSimSession: (sessionId) => request(`/api/simulation/${sessionId}`),
  respondToSim: (sessionId, userResponse) =>
    request(`/api/simulation/${sessionId}/respond`, { method: 'POST', body: { user_response: userResponse } }),
  completeSimulation: (sessionId) => request(`/api/simulation/${sessionId}/complete`, { method: 'POST' }),
  getSimResults: (sessionId) => request(`/api/simulation/${sessionId}/results`),
}
