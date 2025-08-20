import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import { readUserByEmail, readUserByHandle, createUser, updateUserByEmail, verifyPassword, ensureStoreReady } from './store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const PUBLIC_BASE = process.env.PUBLIC_BASE || `http://localhost:${PORT}`
const FRONTEND_DIR = path.join(__dirname, '..')

app.use(cors({ origin: [/^http:\/\/localhost:\d+$/], credentials: false }))
app.use(express.json())
app.use(cookieParser())

// static uploads
const uploadsDir = path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDir))
// serve frontend static assets
app.use(express.static(FRONTEND_DIR))

// memory token store (demo)
const tokenToEmail = new Map()

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'missing token' })
  const email = tokenToEmail.get(token)
  if (!email) return res.status(401).json({ error: 'invalid token' })
  req.userEmail = email
  next()
}

// storage for multer
import fs from 'fs'
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `${uuid()}${ext}`)
  }
})
const upload = multer({ storage })

// health
app.get('/api/health', (req, res) => res.json({ ok: true }))

// register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email e senha são obrigatórios' })
  try {
    const existed = await readUserByEmail(email)
    if (existed) return res.status(409).json({ error: 'Email já cadastrado' })
    const user = await createUser({
      email,
      password,
      handle: '@seuUsuario',
      avatar: null,
      avatarLight: null,
      links: [],
      socials: {},
      theme: 'dark'
    })
    const token = uuid()
    tokenToEmail.set(token, email)
    res.json({ token, user: withPublicUrls(user) })
  } catch (e) {
    res.status(500).json({ error: 'erro ao registrar' })
  }
})

// login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email e senha são obrigatórios' })
  try {
    const ok = await verifyPassword(email, password)
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' })
    const user = await readUserByEmail(email)
    const token = uuid()
    tokenToEmail.set(token, email)
    res.json({ token, user: withPublicUrls(user) })
  } catch (e) {
    res.status(500).json({ error: 'erro ao entrar' })
  }
})

// me
app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await readUserByEmail(req.userEmail)
  res.json({ user: withPublicUrls(user) })
})

app.put('/api/me', authMiddleware, async (req, res) => {
  const allowed = ['handle', 'theme', 'socials', 'links']
  const patch = {}
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
  try {
    const user = await updateUserByEmail(req.userEmail, patch)
    res.json({ user: withPublicUrls(user) })
  } catch (e) {
    if (e.message === 'handle_taken') return res.status(409).json({ error: 'handle já em uso' })
    if (e.message === 'not found') return res.status(404).json({ error: 'usuário não encontrado' })
    res.status(500).json({ error: 'erro ao atualizar' })
  }
})

// upload avatar (variant=dark|light)
app.post('/api/upload/avatar', authMiddleware, upload.single('file'), async (req, res) => {
  const variant = (req.query.variant || 'dark').toString()
  if (!req.file) return res.status(400).json({ error: 'arquivo obrigatório' })
  const publicUrl = `${PUBLIC_BASE}/uploads/${req.file.filename}`
  const field = variant === 'light' ? 'avatarLight' : 'avatar'
  const user = await updateUserByEmail(req.userEmail, { [field]: publicUrl })
  res.json({ url: publicUrl, user: withPublicUrls(user) })
})

function withPublicUrls(user) {
  const u = { ...user }
  // keep as is; server already returns absolute URLs for uploads
  return u
}

// public profile by handle
app.get('/u/:handle', async (req, res) => {
  try {
    const handle = decodeURIComponent(req.params.handle)
    const user = await readUserByHandle(handle)
    if (!user) return res.status(404).json({ error: 'perfil não encontrado' })
    // do not expose sensitive fields
    const { password, email, ...publicUser } = user
    res.json({ user: withPublicUrls(publicUser) })
  } catch (e) {
    res.status(500).json({ error: 'erro ao carregar perfil público' })
  }
})

// Pretty public profile URLs: /@handle -> serve index.html so the SPA can bootstrap
app.get('/@:handle', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'))
})

await ensureStoreReady()
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`)
})


