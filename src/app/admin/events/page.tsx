import { supabaseAdmin } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoEvents } from '@/lib/demo-data'
import { formatDateBR } from '@/lib/format'
import Link from 'next/link'
import { MonthCalendar, type MonthCalendarEvent } from '@/components/month-calendar'
import { auth } from '@/auth'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseMonthParam(value: string | undefined) {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const monthIndex = Number(m[2]) - 1
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null
  return { year, monthIndex }
}

function monthISOFromDate(d: Date) {
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

function dateKeyLocal(d: Date) {
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default async function AdminEventsPage({ searchParams }: PageProps) {
  const session = await auth()
  const sp = (await searchParams) ?? {}
  const monthParam = typeof sp.month === 'string' ? sp.month : undefined
  const parsed = parseMonthParam(monthParam)
  const now = new Date()
  const base = parsed ? new Date(parsed.year, parsed.monthIndex, 1) : new Date(now.getFullYear(), now.getMonth(), 1)
  const monthISO = monthISOFromDate(base)
  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1)
  const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 1)

  const dbOk = await isDbAvailable()

  let monthEvents: Array<{
    id: string
    title: string
    date: Date
    eventType: string
    client?: { name: string | null } | null
    assignments: Array<{ musician: { user: { name: string } } }>
    locationName: string | null
  }> = []
  let monthTasks: Array<{ startAt: Date }> = []
  let events: Array<{
    id: string
    title: string
    date: Date
    client?: { name: string | null } | null
    assignments: Array<unknown>
  }> = []

  if (!dbOk) {
    const demo = demoEvents()
    monthEvents = demo
      .filter((e) => e.date >= monthStart && e.date < monthEnd)
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        eventType: e.eventType,
        client: { name: e.clientName },
        assignments: Array.from({ length: e.musiciansCount }).map(() => ({ musician: { user: { name: '—' } } })),
        locationName: e.locationName,
      }))
    monthTasks = []
    events = demo.map((e) => ({ id: e.id, title: e.title, date: e.date, client: { name: e.clientName }, assignments: [] }))
  } else {
    const [{ data: monthEventRows, error: monthEventsErr }, { data: eventsRows, error: eventsErr }] = await Promise.all([
      supabaseAdmin
        .from('Event')
        .select('id,title,date,eventType,locationName,clientId')
        .gte('date', monthStart.toISOString())
        .lt('date', monthEnd.toISOString())
        .order('date', { ascending: true }),
      supabaseAdmin.from('Event').select('id,title,date,clientId').order('date', { ascending: true }),
    ])

    if (monthEventsErr || eventsErr) {
      monthEvents = []
      monthTasks = []
      events = []
    } else {
      const monthIds = Array.from(new Set((monthEventRows ?? []).map((e) => String(e.id))))
      const allIds = Array.from(new Set((eventsRows ?? []).map((e) => String(e.id))))
      const unionIds = Array.from(new Set([...monthIds, ...allIds]))

      const clientIds = Array.from(
        new Set([...monthEventRows ?? [], ...eventsRows ?? []].map((e) => String((e as { clientId?: string | null }).clientId ?? '')).filter(Boolean)),
      )
      const { data: clients } =
        clientIds.length === 0 ? { data: [] as Array<{ id: string; name: string | null }> } : await supabaseAdmin.from('Client').select('id,name').in('id', clientIds)
      const clientById = new Map((clients ?? []).map((c) => [String(c.id), c]))

      const { data: monthTaskRows } =
        session?.user
          ? await supabaseAdmin
              .from('TaskReminder')
              .select('startAt')
              .eq('userId', session.user.id)
              .gte('startAt', monthStart.toISOString())
              .lt('startAt', monthEnd.toISOString())
          : { data: [] as Array<{ startAt: string }> }
      monthTasks = (monthTaskRows ?? []).map((t) => ({ startAt: new Date(String(t.startAt)) }))

      const { data: assignments } =
        unionIds.length === 0
          ? { data: [] as Array<{ eventId: string; musicianId: string }> }
          : await supabaseAdmin.from('Assignment').select('eventId,musicianId').in('eventId', unionIds)

      const countByEventId = new Map<string, number>()
      for (const a of assignments ?? []) {
        const key = String(a.eventId)
        countByEventId.set(key, (countByEventId.get(key) ?? 0) + 1)
      }

      const monthMusicianIds = Array.from(
        new Set((assignments ?? []).filter((a) => monthIds.includes(String(a.eventId))).map((a) => String(a.musicianId)).filter(Boolean)),
      )
      const { data: musicianProfiles } =
        monthMusicianIds.length === 0
          ? { data: [] as Array<{ id: string; userId: string }> }
          : await supabaseAdmin.from('MusicianProfile').select('id,userId').in('id', monthMusicianIds)
      const userIds = Array.from(new Set((musicianProfiles ?? []).map((m) => String(m.userId)).filter(Boolean)))
      const { data: users } =
        userIds.length === 0 ? { data: [] as Array<{ id: string; name: string }> } : await supabaseAdmin.from('User').select('id,name').in('id', userIds)
      const userNameById = new Map((users ?? []).map((u) => [String(u.id), String(u.name)]))
      const userIdByMusicianId = new Map((musicianProfiles ?? []).map((m) => [String(m.id), String(m.userId)]))

      const musiciansByEventId = new Map<string, string[]>()
      for (const a of assignments ?? []) {
        const eventId = String(a.eventId)
        if (!monthIds.includes(eventId)) continue
        const musicianId = String(a.musicianId)
        const userId = userIdByMusicianId.get(musicianId) ?? ''
        const name = userNameById.get(userId) ?? 'Músico'
        const list = musiciansByEventId.get(eventId) ?? []
        list.push(name)
        musiciansByEventId.set(eventId, list)
      }

      monthEvents = (monthEventRows ?? []).map((e) => ({
        id: String(e.id),
        title: String(e.title),
        date: new Date(String(e.date)),
        eventType: String(e.eventType),
        client: e.clientId ? { name: (clientById.get(String(e.clientId))?.name as string | null) ?? null } : null,
        assignments: (musiciansByEventId.get(String(e.id)) ?? []).map((name) => ({ musician: { user: { name } } })),
        locationName: (e.locationName as string | null) ?? null,
      }))

      events = (eventsRows ?? []).map((e) => ({
        id: String(e.id),
        title: String(e.title),
        date: new Date(String(e.date)),
        client: e.clientId ? { name: (clientById.get(String(e.clientId))?.name as string | null) ?? null } : null,
        assignments: Array.from({ length: countByEventId.get(String(e.id)) ?? 0 }),
      }))
    }
  }

  const calendarEvents: MonthCalendarEvent[] = monthEvents.map((e) => ({
    id: e.id,
    title: e.title,
    dateISO: e.date.toISOString(),
    dateKey: dateKeyLocal(e.date),
    eventType: e.eventType,
    clientName: e.client?.name ?? null,
    locationName: e.locationName ?? null,
    musicians: e.assignments.map((a) => a.musician.user.name),
  }))

  const tasksCountByDay = monthTasks.reduce<Record<string, number>>((acc, t) => {
    const key = dateKeyLocal(t.startAt)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Planner mensal</h2>
          <Link className="text-sm text-amber-200/90 hover:text-amber-200" href={`/admin?month=${monthISO}`}>
            Ver no painel
          </Link>
        </div>
        <div className="mt-4">
          <MonthCalendar basePath="/admin/events" monthISO={monthISO} events={calendarEvents} tasksCountByDay={tasksCountByDay} />
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escala / Agenda</h1>
          <p className="mt-1 text-sm text-zinc-300">Eventos e músicos escalados.</p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
        >
          Novo evento
        </Link>
      </div>

      <div className="grid gap-3">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            Nenhum evento cadastrado.
          </div>
        ) : (
          events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold">{e.title}</div>
                  <div className="text-sm text-zinc-300">
                    {formatDateBR(e.date)}
                    {e.client?.name ? ` · ${e.client.name}` : ''}
                  </div>
                </div>
                <div className="text-sm text-zinc-200">{e.assignments.length} músico(s)</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
