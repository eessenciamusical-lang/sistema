import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MUSICIAN') return new Response('Unauthorized', { status: 401 })

  const profile = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) return new Response('Not found', { status: 404 })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let lastCheck = new Date(Date.now() - 60 * 1000)
      async function tick() {
        try {
          await prisma.musicianProfile.update({ where: { id: profile!.id }, data: { lastSeen: new Date() } })
          const assignments = await prisma.assignment.findMany({
            where: { musicianId: profile!.id, createdAt: { gt: lastCheck } },
            include: { event: { include: { client: true, contract: true } } },
            orderBy: { createdAt: 'asc' },
          })
          lastCheck = new Date()
          for (const a of assignments) {
            const ack = await prisma.notificationAck.findUnique({
              where: { userId_assignmentId: { userId: session!.user!.id, assignmentId: a.id } },
            })
            if (ack) continue
            const payload = {
              type: 'assignment',
              id: a.id,
              eventTitle: a.event.title,
              date: a.event.date,
              client: a.event.client?.name ?? 'Cliente',
              value: a.costCents ?? 0,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          }
        } catch {
          controller.enqueue(encoder.encode(`event: ping\ndata: keep\n\n`))
        }
      }
      setInterval(tick, 5000)
      controller.enqueue(encoder.encode(': connected\n\n'))
      await tick()
    },
    cancel() {},
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
