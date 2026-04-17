import { supabaseAdmin } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from '@/lib/format'
import { enumerateDaysInclusive, toISODateKey } from '@/lib/restaurants'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function RestauranteContratoDetailPage({ params }: Props) {
  const { id } = await params
  const { data: contractRow } = await supabaseAdmin
    .from('RestaurantContract')
    .select('id,restaurantId,startDate,endDate,time,paymentFrequency,receivableTotalCents,totalCents,status')
    .eq('id', id)
    .maybeSingle()
  if (!contractRow) redirect('/admin/restaurantes')

  const { data: restaurant } = await supabaseAdmin.from('Restaurant').select('id,name').eq('id', contractRow.restaurantId).maybeSingle()
  if (!restaurant) redirect('/admin/restaurantes')

  const { data: eventRows } = await supabaseAdmin
    .from('Event')
    .select('id,date')
    .eq('restaurantContractId', contractRow.id)
    .order('date', { ascending: true })

  const eventIds = Array.from(new Set((eventRows ?? []).map((e) => String(e.id))))
  const { data: assignmentRows } =
    eventIds.length === 0
      ? { data: [] as Array<{ id: string; eventId: string; musicianId: string; roleName: string | null; costCents: number | null }> }
      : await supabaseAdmin.from('Assignment').select('id,eventId,musicianId,roleName,costCents').in('eventId', eventIds)

  const musicianIds = Array.from(new Set((assignmentRows ?? []).map((a) => String(a.musicianId)).filter(Boolean)))
  const { data: musicianProfiles } =
    musicianIds.length === 0 ? { data: [] as Array<{ id: string; userId: string }> } : await supabaseAdmin.from('MusicianProfile').select('id,userId').in('id', musicianIds)
  const userIds = Array.from(new Set((musicianProfiles ?? []).map((m) => String(m.userId)).filter(Boolean)))
  const { data: users } = userIds.length === 0 ? { data: [] as Array<{ id: string; name: string }> } : await supabaseAdmin.from('User').select('id,name').in('id', userIds)

  const userNameById = new Map((users ?? []).map((u) => [String(u.id), String(u.name)]))
  const userIdByMusicianId = new Map((musicianProfiles ?? []).map((m) => [String(m.id), String(m.userId)]))

  const assignmentsByEventId = new Map<
    string,
    Array<{ id: string; roleName: string | null; costCents: number | null; musician: { user: { name: string } } }>
  >()
  for (const a of assignmentRows ?? []) {
    const eventId = String(a.eventId)
    const musicianId = String(a.musicianId)
    const userId = userIdByMusicianId.get(musicianId) ?? ''
    const name = userNameById.get(userId) ?? 'Músico'
    const list = assignmentsByEventId.get(eventId) ?? []
    list.push({
      id: String(a.id),
      roleName: (a.roleName as string | null) ?? null,
      costCents: (a.costCents as number | null) ?? null,
      musician: { user: { name } },
    })
    assignmentsByEventId.set(eventId, list)
  }

  const events = (eventRows ?? []).map((e) => ({
    id: String(e.id),
    date: new Date(String(e.date)),
    assignments: assignmentsByEventId.get(String(e.id)) ?? [],
  }))

  const { data: pendingPaymentRows } = await supabaseAdmin
    .from('Payment')
    .select('id,eventId,status,direction,amount,dueDate,note')
    .eq('restaurantContractId', contractRow.id)
    .eq('status', 'PENDING')

  const eventById = new Map(events.map((e) => [e.id, e]))
  const pendingPayments = (pendingPaymentRows ?? [])
    .map((p) => ({
      id: String(p.id),
      direction: p.direction as 'RECEIVABLE' | 'PAYABLE',
      amount: Number(p.amount) || 0,
      status: p.status as 'PENDING',
      dueDate: p.dueDate ? new Date(String(p.dueDate)) : null,
      note: (p.note as string | null) ?? null,
      event: eventById.get(String(p.eventId)) ?? { id: String(p.eventId), date: new Date() },
    }))
    .filter((p) => p.event && p.status === 'PENDING')

  const contract = {
    id: String(contractRow.id),
    restaurant: { name: String(restaurant.name) },
    startDate: new Date(String(contractRow.startDate)),
    endDate: new Date(String(contractRow.endDate)),
    time: String(contractRow.time),
    paymentFrequency: contractRow.paymentFrequency as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    receivableTotalCents: Number(contractRow.receivableTotalCents) || 0,
    totalCents: Number(contractRow.totalCents) || 0,
    status: contractRow.status as 'ACTIVE' | 'ENDED' | 'CANCELLED',
    events,
  }

  const now = new Date()
  const days = enumerateDaysInclusive(contract.startDate, contract.endDate)
  const eventsByDay = new Map<string, typeof contract.events>()
  for (const e of contract.events) {
    const key = toISODateKey(e.date)
    const list = eventsByDay.get(key) ?? []
    list.push(e)
    eventsByDay.set(key, list)
  }

  const upcoming = contract.events.filter((e) => e.date >= now).slice(0, 10)
  const history = contract.events.filter((e) => e.date < now).slice(-10).reverse()

  const endsInDays = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const expiring = contract.status === 'ACTIVE' && endsInDays >= 0 && endsInDays <= 7

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/admin/restaurantes">
          ← Voltar
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{contract.restaurant.name}</h1>
            <div className="mt-1 text-sm text-zinc-300">
              {formatDateBR(contract.startDate)} → {formatDateBR(contract.endDate)} · {contract.time} · Pagamento:{' '}
              {contract.paymentFrequency} · Status: {contract.status}
            </div>
            <div className="mt-2 text-sm text-zinc-200">
              Valor a receber: {formatCurrencyBRL(contract.receivableTotalCents)} · Custo (calculado):{' '}
              {formatCurrencyBRL(contract.totalCents)}
            </div>
            {expiring ? (
              <div className="mt-2 inline-flex rounded-lg bg-amber-300/20 px-3 py-1 text-xs text-amber-200">
                Vence em {endsInDays} dia(s)
              </div>
            ) : null}
          </div>
          <Link
            href={`/admin/restaurantes/${contract.id}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm font-medium text-zinc-50 hover:bg-white/10"
          >
            Editar
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Calendário (músicos por dia)</h2>
        <p className="mt-1 text-sm text-zinc-300">Cada dia é uma apresentação (evento) com um ou mais músicos.</p>
        <div className="mt-4 grid gap-3">
          {days.map((d) => {
            const key = toISODateKey(d)
            const event = (eventsByDay.get(key) ?? [])[0]
            const assignments = event?.assignments ?? []
            const sum = assignments.reduce((s, a) => s + (a.costCents ?? 0), 0)
            return (
              <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium">{d.toLocaleDateString('pt-BR')}</div>
                    <div className="mt-1 text-sm text-zinc-300">
                      {assignments.length === 0 ? (
                        'Sem músicos escalados'
                      ) : (
                        assignments
                          .map((a) => `${a.musician.user.name}${a.roleName ? ` (${a.roleName})` : ''}`)
                          .join(', ')
                      )}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">Custo do dia: {formatCurrencyBRL(sum)}</div>
                  </div>
                  {event ? (
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm hover:bg-white/10"
                      href={`/admin/events/${event.id}`}
                    >
                      Abrir evento
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Próximas apresentações</h2>
          <div className="mt-4 grid gap-3">
            {upcoming.length === 0 ? (
              <div className="text-sm text-zinc-300">Nenhuma apresentação futura.</div>
            ) : (
              upcoming.map((e) => (
                <Link
                  key={e.id}
                  href={`/admin/events/${e.id}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
                >
                  <div className="font-medium">{formatDateTimeBR(e.date)}</div>
                  <div className="mt-1 text-sm text-zinc-300">
                    {e.assignments.map((a) => a.musician.user.name).join(', ') || 'Sem músicos'}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Histórico (últimos 10)</h2>
          <div className="mt-4 grid gap-3">
            {history.length === 0 ? (
              <div className="text-sm text-zinc-300">Sem histórico ainda.</div>
            ) : (
              history.map((e) => (
                <Link
                  key={e.id}
                  href={`/admin/events/${e.id}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
                >
                  <div className="font-medium">{formatDateTimeBR(e.date)}</div>
                  <div className="mt-1 text-sm text-zinc-300">
                    {e.assignments.map((a) => a.musician.user.name).join(', ') || 'Sem músicos'}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Pagamentos pendentes</h2>
        <div className="mt-4 grid gap-3">
          {pendingPayments.length === 0 ? (
            <div className="text-sm text-zinc-300">Nenhuma pendência.</div>
          ) : (
            pendingPayments.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{formatDateTimeBR(p.event.date)}</div>
                    <div className="mt-1 text-sm text-zinc-300">{p.note ?? ''}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {p.direction === 'RECEIVABLE' ? 'A receber' : 'A pagar'} · Venc.:{' '}
                      {p.dueDate ? formatDateBR(p.dueDate) : '—'}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{formatCurrencyBRL(p.amount)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
