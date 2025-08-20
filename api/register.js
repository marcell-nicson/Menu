import { kv } from '@vercel/kv'
import { v4 as uuid } from 'uuid'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const { email, password } = await parseJSON(req)
  if (!email || !password) return res.status(400).json({ error: 'email e senha são obrigatórios' })

  const existed = await kv.get(`user:${email}`)
  if (existed) return res.status(409).json({ error: 'Email já cadastrado' })

  const user = seed({ email, password, handle: '@seuUsuario', links: [], socials: {}, theme: 'dark' })
  await kv.set(`user:${email}`, user)
  await kv.sadd('users:emails', email)

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

function seed(user) {
  const hasLinks = Array.isArray(user.links) && user.links.length > 0
  return {
    ...user,
    handle: user.handle || '@seuUsuario',
    links: hasLinks ? user.links : [
      { label: 'Instagram', url: 'https://instagram.com/usuario' },
      { label: 'GitHub', url: 'https://github.com/usuario' }
    ],
    socials: user.socials && Object.keys(user.socials).length ? user.socials : {
      github: 'https://github.com/usuario',
      instagram: 'https://instagram.com/usuario',
      linkedin: 'https://linkedin.com/in/usuario',
      twitter: 'https://twitter.com/usuario'
    }
  }
}

function publicUser(user) {
  const { password, ...u } = user
  return u
}


