import { supabaseAdmin } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!url) return Response.json({ ok: false, reason: 'SUPABASE_URL missing' }, { status: 500 })
  if (!anonKey) return Response.json({ ok: false, reason: 'NEXT_PUBLIC_SUPABASE_ANON_KEY missing' }, { status: 500 })

  let urlInfo: { protocol: string; host: string; port: string; pathname: string } | null = null
  try {
    const u = new URL(url)
    urlInfo = { protocol: u.protocol, host: u.hostname, port: u.port, pathname: u.pathname }
  } catch {}

  try {
    const { error } = await supabaseAdmin.from('User').select('id').limit(1)
    if (error) {
      return Response.json(
        { ok: false, reason: 'Supabase unreachable or schema missing', urlInfo, hasServiceRole, error: error.message },
        { status: 500 },
      )
    }
    return Response.json({ ok: true, urlInfo, hasServiceRole })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json(
      { ok: false, reason: 'Supabase unreachable or schema missing', urlInfo, hasServiceRole, error: message },
      { status: 500 },
    )
  }
}
