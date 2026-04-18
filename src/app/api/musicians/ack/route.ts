import { auth } from '@/auth'
import { hasSupabaseEnv, supabaseAdmin } from '@/lib/db'
import { newId } from '@/lib/ids'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!hasSupabaseEnv()) return new Response('Server not configured', { status: 500 })
  const body = await req.json().catch(() => null)
  if (!body?.assignmentId) return new Response('Bad request', { status: 400 })
  await supabaseAdmin.from('NotificationAck').upsert(
    { id: newId(), userId: session.user.id, assignmentId: String(body.assignmentId), readAt: new Date().toISOString() },
    { onConflict: 'userId,assignmentId' },
  )
  return new Response('ok')
}
