import { hasSupabaseEnv, hasSupabaseServiceRole, supabaseAdmin } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!hasSupabaseEnv()) return new Response('Server not configured', { status: 500 })
  if (!hasSupabaseServiceRole()) return new Response('Service role missing', { status: 500 })

  const token = process.env.PURGE_TOKEN
  if (!token) return new Response('PURGE_TOKEN missing', { status: 500 })

  const provided = req.headers.get('x-purge-token') ?? ''
  if (provided !== token) return new Response('Unauthorized', { status: 401 })

  const order: Array<{ table: string; filterCol: string }> = [
    { table: 'NotificationAck', filterCol: 'id' },
    { table: 'TaskReminder', filterCol: 'id' },
    { table: 'Payment', filterCol: 'id' },
    { table: 'Assignment', filterCol: 'id' },
    { table: 'Contract', filterCol: 'id' },
    { table: 'Event', filterCol: 'id' },
    { table: 'RestaurantContract', filterCol: 'id' },
    { table: 'Restaurant', filterCol: 'id' },
    { table: 'Client', filterCol: 'id' },
    { table: 'MusicianProfileLink', filterCol: 'id' },
    { table: 'MusicianProfile', filterCol: 'id' },
    { table: 'Lead', filterCol: 'id' },
    { table: 'User', filterCol: 'id' },
  ]

  const results: Array<{ table: string; ok: boolean; error?: string }> = []

  for (const { table, filterCol } of order) {
    const { error } = await supabaseAdmin.from(table).delete().neq(filterCol, '')
    if (error) results.push({ table, ok: false, error: error.message })
    else results.push({ table, ok: true })
  }

  const anyError = results.some((r) => !r.ok)
  return Response.json({ ok: !anyError, results }, { status: anyError ? 500 : 200 })
}

