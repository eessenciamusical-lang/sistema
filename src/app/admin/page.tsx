import { supabaseAdmin } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { contractStatusLabel } from '@/lib/labels'
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

export default async function AdminHome({ searchParams }: PageProps) {
  const session = await auth()
  const now = new Date()
  const sp = (await searchParams) ?? {}
  const monthParam = typeof sp.month === 'string' ? sp.month : undefined
  const parsed = parseMonthParam(monthParam)
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
    locationName: string | null
    clientName: string | null
    musicians: string[]
  }> = []
  let monthTasks: Array<{ startAt: Date }> = []
  let events: Array<{ id: string; title: string; date: Date; clientName: string | null; musiciansCount: number }> = []
  let receivables = { sum: 0, count: 0 }
  let payables = { sum: 0, count: 0 }
  let contracts: Array<{ id: string; status: 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED'; totalAmount: number; eventTitle: string }> = []

  if (dbOk) {
    const [{ data: monthEventRows }, { data: upcomingRows }, { data: recentContractRows }, { data: pendingPayments }, { data: monthTaskRows }] =
      await Promise.all([
        supabaseAdmin
          .from('Event')
          .select('id,title,date,eventType,locationName,clientId')
          .gte('date', monthStart.toISOString())
          .lt('date', monthEnd.toISOString())
          .order('date', { ascending: true }),
        supabaseAdmin.from('Event').select('id,title,date,clientId').gte('date', now.toISOString()).order('date', { ascending: true }).limit(5),
        supabaseAdmin.from('Contract').select('id,status,totalAmount,eventId,updatedAt').order('updatedAt', { ascending: false }).limit(5),
        supabaseAdmin.from('Payment').select('amount,direction,status').eq('status', 'PENDING'),
        session?.user
          ? supabaseAdmin
              .from('TaskReminder')
              .select('startAt')
              .eq('userId', session.user.id)
              .gte('startAt', monthStart.toISOString())
              .lt('startAt', monthEnd.toISOString())
          : ({ data: [] } as { data: Array<{ startAt: string }> }),
      ])

    monthTasks = (monthTaskRows ?? []).map((t) => ({ startAt: new Date(String(t.startAt)) }))

    const clientIds = Array.from(
      new Set([...monthEventRows ?? [], ...upcomingRows ?? []].map((e) => String((e as { clientId?: string | null }).clientId ?? '')).filter(Boolean)),
    )
    const { data: clients } =
      clientIds.length === 0 ? { data: [] as Array<{ id: string; name: string | null }> } : await supabaseAdmin.from('Client').select('id,name').in('id', clientIds)
    const clientById = new Map((clients ?? []).map((c) => [String(c.id), c]))

    const monthIds = Array.from(new Set((monthEventRows ?? []).map((e) => String(e.id))))
    const upcomingIds = Array.from(new Set((upcomingRows ?? []).map((e) => String(e.id))))
    const contractEventIds = Array.from(new Set((recentContractRows ?? []).map((c) => String((c as { eventId?: string }).eventId ?? '')).filter(Boolean)))
    const allEventIds = Array.from(new Set([...monthIds, ...upcomingIds, ...contractEventIds]))

    const { data: assignmentRows } =
      allEventIds.length === 0
        ? { data: [] as Array<{ eventId: string; musicianId: string }> }
        : await supabaseAdmin.from('Assignment').select('eventId,musicianId').in('eventId', allEventIds)

    const countByEventId = new Map<string, number>()
    for (const a of assignmentRows ?? []) {
      const key = String(a.eventId)
      countByEventId.set(key, (countByEventId.get(key) ?? 0) + 1)
    }

    const monthMusicianIds = Array.from(
      new Set((assignmentRows ?? []).filter((a) => monthIds.includes(String(a.eventId))).map((a) => String(a.musicianId)).filter(Boolean)),
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
    for (const a of assignmentRows ?? []) {
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
      locationName: (e.locationName as string | null) ?? null,
      clientName: e.clientId ? ((clientById.get(String(e.clientId))?.name as string | null) ?? null) : null,
      musicians: musiciansByEventId.get(String(e.id)) ?? [],
    }))

    events = (upcomingRows ?? []).map((e) => ({
      id: String(e.id),
      title: String(e.title),
      date: new Date(String(e.date)),
      clientName: e.clientId ? ((clientById.get(String(e.clientId))?.name as string | null) ?? null) : null,
      musiciansCount: countByEventId.get(String(e.id)) ?? 0,
    }))

    const receiv = (pendingPayments ?? []).filter((p) => p.direction === 'RECEIVABLE')
    const payab = (pendingPayments ?? []).filter((p) => p.direction === 'PAYABLE')
    receivables = { sum: receiv.reduce((s, p) => s + (Number(p.amount) || 0), 0), count: receiv.length }
    payables = { sum: payab.reduce((s, p) => s + (Number(p.amount) || 0), 0), count: payab.length }

    const recentEventIds = Array.from(new Set((recentContractRows ?? []).map((c) => String((c as { eventId?: string }).eventId ?? '')).filter(Boolean)))
    const { data: recentEvents } =
      recentEventIds.length === 0 ? { data: [] as Array<{ id: string; title: string }> } : await supabaseAdmin.from('Event').select('id,title').in('id', recentEventIds)
    const eventTitleById = new Map((recentEvents ?? []).map((e) => [String(e.id), String(e.title)]))
    contracts = (recentContractRows ?? []).map((c) => ({
      id: String(c.id),
      status: c.status as 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED',
      totalAmount: Number(c.totalAmount) || 0,
      eventTitle: eventTitleById.get(String((c as { eventId?: string }).eventId ?? '')) ?? 'Evento',
    }))
  }

  const calendarEvents: MonthCalendarEvent[] = monthEvents.map((e) => ({
    id: e.id,
    title: e.title,
    dateISO: e.date.toISOString(),
    dateKey: dateKeyLocal(e.date),
    eventType: e.eventType,
    clientName: e.clientName,
    locationName: e.locationName,
    musicians: e.musicians,
  }))

  const tasksCountByDay = monthTasks.reduce<Record<string, number>>((acc, t) => {
    const key = dateKeyLocal(t.startAt)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Planner mensal</h2>
          <Link className="text-sm text-amber-200/90 hover:text-amber-200" href={`/admin/events?month=${monthISO}`}>
            Ver na escala
          </Link>
        </div>
        <div className="mt-4">
          <MonthCalendar basePath="/admin" monthISO={monthISO} events={calendarEvents} tasksCountByDay={tasksCountByDay} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">A receber</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(receivables.sum)}</div>
          <div className="mt-1 text-sm text-zinc-400">{receivables.count} lançamentos pendentes</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">A pagar (cachês)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(payables.sum)}</div>
          <div className="mt-1 text-sm text-zinc-400">{payables.count} lançamentos pendentes</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">Atalhos</div>
          <div className="mt-3 grid gap-2">
            <Link className="rounded-xl bg-white/5 px-4 py-3 text-sm hover:bg-white/10" href="/admin/events/new">
              Criar evento
            </Link>
            <Link className="rounded-xl bg-white/5 px-4 py-3 text-sm hover:bg-white/10" href="/admin/financeiro">
              Ver financeiro
            </Link>
            <Link className="rounded-xl bg-white/5 px-4 py-3 text-sm hover:bg-white/10" href="/admin/contracts">
              Contratos e PDF
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Próximos eventos</h2>
            <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/admin/events">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {events.length === 0 ? (
              <div className="text-sm text-zinc-300">Nenhum evento futuro cadastrado.</div>
            ) : (
              events.map((e) => (
                <Link
                  key={e.id}
                  href={`/admin/events/${e.id}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{e.title}</div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {formatDateBR(e.date)}
                        {e.clientName ? ` · ${e.clientName}` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-300">{e.musiciansCount} músico(s)</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Contratos recentes</h2>
            <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/admin/contracts">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {contracts.length === 0 ? (
              <div className="text-sm text-zinc-300">Nenhum contrato criado.</div>
            ) : (
              contracts.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/contracts/${c.id}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{c.eventTitle}</div>
                      <div className="mt-1 text-sm text-zinc-300">Status: {contractStatusLabel(c.status)}</div>
                    </div>
                    <div className="text-sm text-zinc-200">{formatCurrencyBRL(c.totalAmount)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
