import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  const handle = decodeURIComponent(req.query.handle)
  const user = await findByHandle(handle)
  if (!user) return res.status(404).json({ error: 'perfil não encontrado' })
  const { password, email, ...publicUser } = user
  res.json({ user: publicUser })
}

async function findByHandle(handle) {
  const emails = await kv.smembers('users:emails')
  for (const email of emails) {
    const u = await kv.get(`user:${email}`)
    if (u && u.handle === handle) return u
  }
  return null
}


