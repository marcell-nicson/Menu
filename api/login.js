import { kv } from '@vercel/kv'
import { v4 as uuid } from 'uuid'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const { email, password } = await parseJSON(req)
  if (!email || !password) return res.status(400).json({ error: 'email e senha são obrigatórios' })
  const user = await kv.get(`user:${email}`)
  if (!user || user.password !== password) return res.status(401).json({ error: 'Credenciais inválidas' })
  const token = uuid()
  await kv.set(`token:${token}`, email, { ex: 60 * 60 * 24 * 7 })
  res.json({ token, user: publicUser(user) })
}

async function parseJSON(req) {
  try {
    const buf = await new Response(req.body).text()
    return JSON.parse(buf || '{}')
  } catch {
    return {}
  }
}

function publicUser(user) {
  const { password, ...u } = user
  return u
}


