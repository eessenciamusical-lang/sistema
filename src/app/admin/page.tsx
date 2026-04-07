import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { contractStatusLabel } from '@/lib/labels'
import Link from 'next/link'
import { MonthCalendar, type MonthCalendarEvent } from '@/components/month-calendar'
import { auth } from '@/auth'
import type { Prisma } from '@prisma/client'

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

  type MonthEvent = Prisma.EventGetPayload<{
    include: { client: true; assignments: { include: { musician: { include: { user: true } } } } }
  }>
  type UpcomingEvent = Prisma.EventGetPayload<{ include: { client: true; assignments: true } }>
  type RecentContract = Prisma.ContractGetPayload<{ include: { event: true } }>

  let monthEvents: MonthEvent[] = []
  let monthTasks: Array<{ startAt: Date }> = []
  let events: UpcomingEvent[] = []
  let receivables: { _sum: { amount: number | null }; _count: number } = { _sum: { amount: 0 }, _count: 0 }
  let payables: { _sum: { amount: number | null }; _count: number } = { _sum: { amount: 0 }, _count: 0 }
  let contracts: RecentContract[] = []

  try {
    ;[monthEvents, monthTasks, events, receivables, payables, contracts] = await Promise.all([
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
        where: { date: { gte: now } },
        orderBy: { date: 'asc' },
        take: 5,
        include: { client: true, assignments: true },
      }),
      prisma.payment.aggregate({
        where: { direction: 'RECEIVABLE', status: { not: 'PAID' } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { direction: 'PAYABLE', status: { not: 'PAID' } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.contract.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { event: true },
      }),
    ])
  } catch {}

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
    <div className="grid gap-8">
      {events.length === 0 && contracts.length === 0 && monthEvents.length === 0 ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          Banco de dados não configurado ou indisponível. Configure o DATABASE_URL na Vercel e aplique o schema
          (prisma db push) para habilitar os dados.
        </div>
      ) : null}
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
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(receivables._sum.amount ?? 0)}</div>
          <div className="mt-1 text-sm text-zinc-400">{receivables._count} lançamentos pendentes</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">A pagar (cachês)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(payables._sum.amount ?? 0)}</div>
          <div className="mt-1 text-sm text-zinc-400">{payables._count} lançamentos pendentes</div>
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
                        {e.client?.name ? ` · ${e.client.name}` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-300">{e.assignments.length} músico(s)</div>
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
                      <div className="font-medium">{c.event.title}</div>
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
