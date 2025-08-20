import { kv } from '@vercel/kv'
import { put } from '@vercel/blob'
import Busboy from 'busboy'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
  const email = await authenticate(req)
  if (!email) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  try {
    const { buffer, filename, mime } = await readFileFromRequest(req)
    const blob = await put(`uploads/${Date.now()}-${filename}`, buffer, { contentType: mime, access: 'public' })
    const user = await kv.get(`user:${email}`)
    const updated = { ...user, avatar: blob.url }
    await kv.set(`user:${email}`, updated)
    res.json({ url: blob.url, user: publicUser(updated) })
  } catch (e) {
    res.status(500).json({ error: 'erro no upload' })
  }
}

async function readFileFromRequest(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers })
    let fileBuffer = Buffer.alloc(0)
    let fileInfo = { filename: 'file', mime: 'application/octet-stream' }
    bb.on('file', (_name, file, info) => {
      const { filename, mimeType } = info
      fileInfo = { filename, mime: mimeType }
      file.on('data', d => { fileBuffer = Buffer.concat([fileBuffer, d]) })
    })
    bb.on('close', () => resolve({ buffer: fileBuffer, ...fileInfo }))
    bb.on('error', reject)
    req.pipe(bb)
  })
}

async function authenticate(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  return await kv.get(`token:${token}`)
}

function publicUser(user) {
  const { password, ...u } = user || {}
  return u
}


