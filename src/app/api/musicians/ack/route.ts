import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MUSICIAN') return new Response('Unauthorized', { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.assignmentId) return new Response('Bad request', { status: 400 })
  await prisma.notificationAck.upsert({
    where: { userId_assignmentId: { userId: session.user.id, assignmentId: String(body.assignmentId) } },
    update: { readAt: new Date() },
    create: { userId: session.user.id, assignmentId: String(body.assignmentId) },
  })
  return new Response('ok')
}

