import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  const email = await authenticate(req)
  if (!email) return res.status(401).json({ error: 'unauthorized' })

  if (req.method === 'GET') {
    const user = await kv.get(`user:${email}`)
    return res.json({ user: publicUser(user) })
  }

  if (req.method === 'PUT') {
    const patch = await parseJSON(req)
    const allowed = ['handle', 'theme', 'socials', 'links']
    const filtered = {}
    for (const k of allowed) if (k in patch) filtered[k] = patch[k]

    const current = await kv.get(`user:${email}`)
    if (!current) return res.status(404).json({ error: 'not found' })
    if (filtered.handle && filtered.handle !== current.handle) {
      const taken = await isHandleTaken(filtered.handle, email)
      if (taken) return res.status(409).json({ error: 'handle já em uso' })
    }
    const updated = { ...current, ...filtered }
    await kv.set(`user:${email}`, updated)
    return res.json({ user: publicUser(updated) })
  }

  return res.status(405).json({ error: 'method not allowed' })
}

async function authenticate(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  return await kv.get(`token:${token}`)
}

async function parseJSON(req) {
  try {
    const buf = await new Response(req.body).text()
    return JSON.parse(buf || '{}')
  } catch {
    return {}
  }
}

async function isHandleTaken(handle, exceptEmail) {
  const emails = await kv.smembers('users:emails')
  for (const e of emails) {
    if (e === exceptEmail) continue
    const u = await kv.get(`user:${e}`)
    if (u && u.handle === handle) return true
  }
  return false
}

function publicUser(user) {
  const { password, ...u } = user || {}
  return u
}


