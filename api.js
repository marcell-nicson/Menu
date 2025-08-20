// Cliente simples para a API
const API_BASE = window.API_BASE || 'http://localhost:3000'
const TOKEN_KEY = 'devlinks_token'

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function isLoggedIn() {
  return !!getToken()
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {}
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  })
  if (!res.ok) {
    let message = 'Erro de requisição'
    try {
      const data = await res.json()
      message = data.error || message
    } catch (_) {}
    throw new Error(message)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

async function login(email, password) {
  const data = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  setToken(data.token)
  return data.user
}

async function register(email, password) {
  const data = await apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  setToken(data.token)
  return data.user
}

async function getMe() {
  const data = await apiFetch('/api/me', { method: 'GET' })
  return data.user
}

async function updateMe(patch) {
  const data = await apiFetch('/api/me', {
    method: 'PUT',
    body: JSON.stringify(patch)
  })
  return data.user
}

async function uploadAvatar(file, variant = 'dark') {
  const form = new FormData()
  form.append('file', file)
  const data = await apiFetch(`/api/upload/avatar?variant=${encodeURIComponent(variant)}`, {
    method: 'POST',
    body: form
  })
  return data
}

function logout() {
  setToken(null)
}

window.api = { setToken, getToken, isLoggedIn, login, register, getMe, updateMe, uploadAvatar, logout, API_BASE }

