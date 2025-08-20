import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import Redis from 'ioredis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const usersFile = path.join(dataDir, 'users.json')

let redis = null
const REDIS_URL = process.env.REDIS_URL || ''

export async function ensureStoreReady() {
  await fs.ensureDir(dataDir)
  if (!(await fs.pathExists(usersFile))) await fs.writeJson(usersFile, [])
  if (REDIS_URL) {
    try {
      redis = new Redis(REDIS_URL)
      await redis.ping()
      console.log('Redis conectado')
    } catch (e) {
      console.warn('Falha ao conectar no Redis, usando arquivo JSON. Erro:', e.message)
      redis = null
    }
  }
}

async function readAllUsersFile() {
  return (await fs.readJson(usersFile)) || []
}

async function writeAllUsersFile(users) {
  await fs.writeJson(usersFile, users, { spaces: 2 })
}

export async function readUserByEmail(email) {
  if (redis) {
    const json = await redis.get(`user:${email}`)
    return json ? JSON.parse(json) : null
  }
  const users = await readAllUsersFile()
  return users.find(u => u.email === email) || null
}

export async function createUser(user) {
  if (redis) {
    const exists = await readUserByEmail(user.email)
    if (exists) throw new Error('exists')
    // dados fakes iniciais para experiência
    const seeded = withSeed(user)
    await redis.set(`user:${user.email}`, JSON.stringify(seeded))
    await redis.sadd('users:emails', user.email)
    return seeded
  }
  const users = await readAllUsersFile()
  if (users.some(u => u.email === user.email)) throw new Error('exists')
  const seeded = withSeed(user)
  users.push(seeded)
  await writeAllUsersFile(users)
  return seeded
}

export async function updateUserByEmail(email, patch) {
  if (redis) {
    const user = await readUserByEmail(email)
    if (!user) throw new Error('not found')
    // Uniqueness for handle
    if (patch.handle && patch.handle !== user.handle) {
      const taken = await isHandleTaken(patch.handle, email)
      if (taken) throw new Error('handle_taken')
    }
    const updated = { ...user, ...patch }
    await redis.set(`user:${email}`, JSON.stringify(updated))
    return updated
  }
  const users = await readAllUsersFile()
  const idx = users.findIndex(u => u.email === email)
  if (idx === -1) throw new Error('not found')
  if (patch.handle && patch.handle !== users[idx].handle) {
    const exists = users.some(u => u.handle === patch.handle && u.email !== email)
    if (exists) throw new Error('handle_taken')
  }
  users[idx] = { ...users[idx], ...patch }
  await writeAllUsersFile(users)
  return users[idx]
}

export async function verifyPassword(email, password) {
  const u = await readUserByEmail(email)
  return !!u && u.password === password
}

function withSeed(user) {
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

export async function readUserByHandle(handle) {
  if (!handle) return null
  if (redis) {
    const emails = await redis.smembers('users:emails')
    for (const email of emails) {
      const json = await redis.get(`user:${email}`)
      if (!json) continue
      const u = JSON.parse(json)
      if (u && u.handle === handle) return u
    }
    return null
  }
  const users = await readAllUsersFile()
  return users.find(u => u.handle === handle) || null
}

async function isHandleTaken(handle, exceptEmail) {
  if (redis) {
    const emails = await redis.smembers('users:emails')
    for (const email of emails) {
      if (email === exceptEmail) continue
      const json = await redis.get(`user:${email}`)
      if (!json) continue
      const u = JSON.parse(json)
      if (u && u.handle === handle) return true
    }
    return false
  }
  const users = await readAllUsersFile()
  return users.some(u => u.email !== exceptEmail && u.handle === handle)
}


