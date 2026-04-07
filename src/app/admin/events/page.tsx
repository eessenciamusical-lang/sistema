import { prisma } from '@/lib/db'
import { formatDateBR } from '@/lib/format'
import Link from 'next/link'
import { MonthCalendar, type MonthCalendarEvent } from '@/components/month-calendar'
import { auth } from '@/auth'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

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

  const [monthEvents, monthTasks, events] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      orderBy: { date: 'asc' },
      include: { client: true, assignments: { include: { musician: { include: { user: true } } } } },
    }),
    session?.user
      ? prisma.taskReminder.findMany({
          where: { userId: session.user.id, startAt: { gte: monthStart, lt: monthEnd } },
          select: { startAt: true },
        })
      : Promise.resolve([]),
    prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: { client: true, assignments: true },
    }),
  ])

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
