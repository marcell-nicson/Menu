// Persistência simples com localStorage
const STORAGE_KEYS = {
  users: 'devlinks_users',
  session: 'devlinks_session_email'
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || []
  } catch (_) {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
}

function setSession(email) {
  localStorage.setItem(STORAGE_KEYS.session, email)
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session)
}

function getSessionEmail() {
  return localStorage.getItem(STORAGE_KEYS.session)
}

function getCurrentUser() {
  const email = getSessionEmail()
  if (!email) return null
  return readUsers().find(u => u.email === email) || null
}

function upsertCurrentUser(update) {
  const users = readUsers()
  const email = getSessionEmail()
  if (!email) return
  const idx = users.findIndex(u => u.email === email)
  if (idx === -1) return
  users[idx] = { ...users[idx], ...update }
  writeUsers(users)
}

function registerUser(email, password) {
  const users = readUsers()
  if (users.some(u => u.email === email)) {
    throw new Error('Email já cadastrado')
  }
  const newUser = {
    email,
    password,
    handle: '@seuUsuario',
    avatar: './assets/avatar.png',
    avatarLight: './assets/avatar-light.png',
    links: [],
    socials: {},
    theme: 'dark'
  }
  users.push(newUser)
  writeUsers(users)
  setSession(email)
  return newUser
}

function loginUser(email, password) {
  const users = readUsers()
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) throw new Error('Credenciais inválidas')
  setSession(email)
  return user
}

function logoutUser() {
  clearSession()
}

// Para uso em outras páginas
window.getCurrentUser = getCurrentUser
window.upsertCurrentUser = upsertCurrentUser
window.registerUser = registerUser
window.loginUser = loginUser
window.logoutUser = logoutUser

