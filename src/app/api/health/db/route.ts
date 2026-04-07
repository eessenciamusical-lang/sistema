import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  if (!process.env.DATABASE_URL) return Response.json({ ok: false, reason: 'DATABASE_URL missing' }, { status: 500 })

  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false, reason: 'DB unreachable or schema missing' }, { status: 500 })
  }
}

