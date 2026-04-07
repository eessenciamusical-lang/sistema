import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const raw = process.env.DATABASE_URL
  if (!raw) return Response.json({ ok: false, reason: 'DATABASE_URL missing' }, { status: 500 })

  let urlInfo: { protocol: string; host: string; port: string; pathname: string; schemaParam: string | null } | null = null
  let atCount = 0
  try {
    const stopAt = raw.indexOf('?') === -1 ? raw.length : raw.indexOf('?')
    const prefix = raw.slice(0, stopAt)
    atCount = (prefix.match(/@/g) ?? []).length
  } catch {}

  try {
    const u = new URL(raw)
    urlInfo = {
      protocol: u.protocol,
      host: u.hostname,
      port: u.port,
      pathname: u.pathname,
      schemaParam: u.searchParams.get('schema'),
    }
  } catch {}

  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true, urlInfo, atCount })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, reason: 'DB unreachable or schema missing', urlInfo, atCount, error: message }, { status: 500 })
  }
}
