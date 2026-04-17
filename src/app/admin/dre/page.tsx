import { supabaseAdmin } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoContracts, demoEvents, demoPayments } from '@/lib/demo-data'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import Link from 'next/link'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function toStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function toEndOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function parseDateOnly(value: string | undefined) {
  if (!value) return null
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const dd = m[1]
  const mm = m[2]
  const yyyy = m[3]
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

export default async function AdminDrePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const fromRaw = typeof sp.from === 'string' ? sp.from : undefined
  const toRaw = typeof sp.to === 'string' ? sp.to : undefined

  const fromDate = parseDateOnly(fromRaw)
  const toDate = parseDateOnly(toRaw)

  const dbOk = await isDbAvailable()

  let rows: Array<{ contractId: string; eventDate: Date; eventTitle: string; receivedCents: number; bandCostCents: number; profitCents: number }> = []

  if (!dbOk) {
    const contracts = demoContracts()
    const events = demoEvents()
    const payments = demoPayments()
    const receivedTotal = payments.filter((p) => p.direction === 'RECEIVABLE').reduce((sum, p) => sum + p.amount, 0)
    const costTotal = payments.filter((p) => p.direction === 'PAYABLE').reduce((sum, p) => sum + p.amount, 0)
    rows = contracts.map((c) => {
      const ev = events.find((e) => e.id === c.eventId)
      const receivedCents = receivedTotal
      const bandCostCents = costTotal
      return {
        contractId: c.id,
        eventDate: ev?.date ?? new Date(),
        eventTitle: ev?.title ?? c.eventTitle,
        receivedCents,
        bandCostCents,
        profitCents: receivedCents - bandCostCents,
      }
    })
  } else {
    let evQuery = supabaseAdmin.from('Event').select('id,title,date').order('date', { ascending: true })
    if (fromDate) evQuery = evQuery.gte('date', toStartOfDay(fromDate).toISOString())
    if (toDate) evQuery = evQuery.lte('date', toEndOfDay(toDate).toISOString())
    const { data: events, error: evErr } = await evQuery
    if (evErr || !events) {
      rows = []
    } else {
      const eventIds = Array.from(new Set(events.map((e) => String(e.id))))
      const { data: contracts, error: cErr } =
        eventIds.length === 0
          ? { data: [] as Array<{ id: string; eventId: string }>, error: null as null | unknown }
          : await supabaseAdmin.from('Contract').select('id,eventId').eq('status', 'SIGNED').in('eventId', eventIds)
      if (cErr || !contracts) {
        rows = []
      } else {
        const contractIds = Array.from(new Set(contracts.map((c) => String(c.id))))

        const { data: assignments } =
          eventIds.length === 0
            ? { data: [] as Array<{ eventId: string; costCents: number | null }> }
            : await supabaseAdmin.from('Assignment').select('eventId,costCents').in('eventId', eventIds)
        const bandCostByEventId = new Map<string, number>()
        for (const a of assignments ?? []) {
          const key = String(a.eventId)
          bandCostByEventId.set(key, (bandCostByEventId.get(key) ?? 0) + (a.costCents ?? 0))
        }

        const { data: receivables } =
          contractIds.length === 0
            ? { data: [] as Array<{ contractId: string | null; amount: number; status: string }> }
            : await supabaseAdmin
                .from('Payment')
                .select('contractId,amount,status')
                .eq('direction', 'RECEIVABLE')
                .eq('status', 'RECEIVED')
                .in('contractId', contractIds)

        const receivedByContract = new Map<string, number>()
        for (const p of receivables ?? []) {
          if (!p.contractId) continue
          const key = String(p.contractId)
          receivedByContract.set(key, (receivedByContract.get(key) ?? 0) + (Number(p.amount) || 0))
        }

        const eventById = new Map(events.map((e) => [String(e.id), e]))

        rows = contracts.map((c) => {
          const ev = eventById.get(String(c.eventId))
          const bandCostCents = bandCostByEventId.get(String(c.eventId)) ?? 0
          const receivedCents = receivedByContract.get(String(c.id)) ?? 0
          return {
            contractId: String(c.id),
            eventDate: ev?.date ? new Date(String(ev.date)) : new Date(),
            eventTitle: ev?.title ? String(ev.title) : 'Evento',
            receivedCents,
            bandCostCents,
            profitCents: receivedCents - bandCostCents,
          }
        })
      }
    }
  }

  const totalProfit = rows.reduce((sum, r) => sum + r.profitCents, 0)
  const totalReceived = rows.reduce((sum, r) => sum + r.receivedCents, 0)
  const totalCost = rows.reduce((sum, r) => sum + r.bandCostCents, 0)

  const daily = new Map<string, { date: string; profit: number; received: number; cost: number }>()
  for (const r of rows) {
    const key = r.eventDate.toISOString().slice(0, 10)
    const current = daily.get(key) ?? { date: key, profit: 0, received: 0, cost: 0 }
    current.profit += r.profitCents
    current.received += r.receivedCents
    current.cost += r.bandCostCents
    daily.set(key, current)
  }

  const dailyRows = Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DRE</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Demonstrativo de Resultado: valor recebido − custo total da banda (por contrato).
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <form className="grid gap-3 sm:grid-cols-3 sm:items-end" method="get">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">De (dd/mm/aaaa)</span>
            <input
              name="from"
              placeholder="01/01/2026"
              defaultValue={fromRaw}
              className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Até (dd/mm/aaaa)</span>
            <input
              name="to"
              placeholder="31/12/2026"
              defaultValue={toRaw}
              className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            />
          </label>
          <button className="h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">
            Filtrar
          </button>

          <div className="sm:col-span-3 mt-2 flex flex-col gap-2 sm:flex-row">
            <a
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10"
              href={`/api/reports/dre?format=pdf&from=${encodeURIComponent(fromRaw ?? '')}&to=${encodeURIComponent(toRaw ?? '')}`}
              target="_blank"
              rel="noreferrer"
            >
              Exportar PDF
            </a>
            <a
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10"
              href={`/api/reports/dre?format=xlsx&from=${encodeURIComponent(fromRaw ?? '')}&to=${encodeURIComponent(toRaw ?? '')}`}
              target="_blank"
              rel="noreferrer"
            >
              Exportar Excel
            </a>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">Recebido</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(totalReceived)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">Custo (banda)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(totalCost)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">Lucro líquido</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(totalProfit)}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Lucro por data</h2>
        <div className="mt-4 grid gap-3">
          {dailyRows.length === 0 ? (
            <div className="text-sm text-zinc-300">Sem dados no período.</div>
          ) : (
            dailyRows.map((d) => (
              <div key={d.date} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium">{formatDateBR(new Date(`${d.date}T00:00:00`))}</div>
                  <div className="text-sm text-zinc-200">{formatCurrencyBRL(d.profit)}</div>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                  <div>Recebido: {formatCurrencyBRL(d.received)}</div>
                  <div>Custo: {formatCurrencyBRL(d.cost)}</div>
                  <div>Resultado: {formatCurrencyBRL(d.profit)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Contratos (detalhado)</h2>
        <div className="mt-4 grid gap-3">
          {rows.length === 0 ? (
            <div className="text-sm text-zinc-300">Sem contratos assinados no período.</div>
          ) : (
            rows.map((r) => (
              <Link
                key={r.contractId}
                className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
                href={`/admin/contracts/${r.contractId}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{r.eventTitle}</div>
                    <div className="mt-1 text-sm text-zinc-300">{formatDateBR(r.eventDate)}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatCurrencyBRL(r.profitCents)}</div>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                  <div>Recebido: {formatCurrencyBRL(r.receivedCents)}</div>
                  <div>Custo: {formatCurrencyBRL(r.bandCostCents)}</div>
                  <div>Resultado: {formatCurrencyBRL(r.profitCents)}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
