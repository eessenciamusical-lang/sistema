import { prisma } from '@/lib/db'

const globalForDb = globalThis as unknown as {
  __dbOkCache?: { value: boolean; at: number }
}

export async function isDbAvailable() {
  const cached = globalForDb.__dbOkCache
  const now = Date.now()
  if (cached && now - cached.at < 30_000) return cached.value

  const url = process.env.DATABASE_URL
  if (!url) {
    globalForDb.__dbOkCache = { value: false, at: now }
    return false
  }

  if (url.includes('<') || url.includes('SUA_SENHA') || url.includes('YOUR-PASSWORD')) {
    globalForDb.__dbOkCache = { value: false, at: now }
    return false
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    globalForDb.__dbOkCache = { value: true, at: now }
    return true
  } catch {
    globalForDb.__dbOkCache = { value: false, at: now }
    return false
  }
}

