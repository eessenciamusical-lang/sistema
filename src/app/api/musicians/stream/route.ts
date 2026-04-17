import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabaseAdmin.from('MusicianProfile').select('id').eq('userId', session.user.id).maybeSingle()
  if (!profile) return new Response('Not found', { status: 404 })
  const profileId = String(profile.id)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let lastCheck = new Date(Date.now() - 60 * 1000)
      async function tick() {
        try {
          await supabaseAdmin.from('MusicianProfile').update({ lastSeen: new Date().toISOString() }).eq('id', profileId)

          const { data: assignments } = await supabaseAdmin
            .from('Assignment')
            .select('id,eventId,costCents,createdAt')
            .eq('musicianId', profileId)
            .gt('createdAt', lastCheck.toISOString())
            .order('createdAt', { ascending: true })
          lastCheck = new Date()

          const assignmentIds = Array.from(new Set((assignments ?? []).map((a) => String(a.id))))
          const { data: acks } =
            assignmentIds.length === 0
              ? { data: [] as Array<{ assignmentId: string }> }
              : await supabaseAdmin.from('NotificationAck').select('assignmentId').eq('userId', session.user.id).in('assignmentId', assignmentIds)
          const acked = new Set((acks ?? []).map((a) => String(a.assignmentId)))

          const eventIds = Array.from(new Set((assignments ?? []).map((a) => String(a.eventId)).filter(Boolean)))
          const { data: events } =
            eventIds.length === 0 ? { data: [] as Array<{ id: string; title: string; date: string; clientId: string | null }> } : await supabaseAdmin.from('Event').select('id,title,date,clientId').in('id', eventIds)
          const clientIds = Array.from(new Set((events ?? []).map((e) => String(e.clientId ?? '')).filter(Boolean)))
          const { data: clients } =
            clientIds.length === 0 ? { data: [] as Array<{ id: string; name: string | null }> } : await supabaseAdmin.from('Client').select('id,name').in('id', clientIds)
          const clientById = new Map((clients ?? []).map((c) => [String(c.id), c]))
          const eventById = new Map((events ?? []).map((e) => [String(e.id), e]))

          for (const a of assignments ?? []) {
            if (acked.has(String(a.id))) continue
            const ev = eventById.get(String(a.eventId))
            const client = ev?.clientId ? clientById.get(String(ev.clientId))?.name ?? 'Cliente' : 'Cliente'
            const payload = {
              type: 'assignment',
              id: a.id,
              eventTitle: ev?.title ?? 'Evento',
              date: ev?.date ?? null,
              client,
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
