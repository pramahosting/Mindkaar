const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    throw new Error(message)
  }

  return data
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/api/auth/me'),

  saveProfile: (profile) => request('/api/mindgym/profile', { method: 'POST', body: profile }),
  getScenario: (profile) => request('/api/mindgym/scenario', { method: 'POST', body: { profile } }),
  getQuestions: (profile, scenario) =>
    request('/api/mindgym/questions', { method: 'POST', body: { profile, scenario } }),
  getGameConfig: (scenario) => request(`/api/mindgym/game/${encodeURIComponent(scenario)}`),
  submitScore: (payload) => request('/api/mindgym/score', { method: 'POST', body: payload }),
}
