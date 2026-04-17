import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.assignmentId) return new Response('Bad request', { status: 400 })
  await supabaseAdmin.from('NotificationAck').upsert(
    { userId: session.user.id, assignmentId: String(body.assignmentId), readAt: new Date().toISOString() },
    { onConflict: 'userId,assignmentId' },
  )
  return new Response('ok')
}
