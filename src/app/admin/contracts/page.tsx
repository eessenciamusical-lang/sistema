import { supabaseAdmin } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoContracts, demoEvents } from '@/lib/demo-data'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { contractStatusLabel } from '@/lib/labels'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminContractsPage() {
  const dbOk = await isDbAvailable()
  let contracts:
    | Array<{
        id: string
        event: { title: string; date: Date }
        status: 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED'
        totalAmount: number
      }>
    | [] = []

  if (!dbOk) {
    const demoC = demoContracts()
    const events = demoEvents()
    contracts = demoC.map((c) => {
      const ev = events.find((e) => e.id === c.eventId)
      return {
        id: c.id,
        event: { title: ev?.title ?? c.eventTitle, date: ev?.date ?? new Date() },
        status: c.status,
        totalAmount: c.totalAmount,
      }
    })
  } else {
    const { data: rows, error } = await supabaseAdmin
      .from('Contract')
      .select('id,status,totalAmount,eventId,updatedAt')
      .order('updatedAt', { ascending: false })
    if (error) {
      contracts = []
      return (
        <div className="grid gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
            <p className="mt-1 text-sm text-zinc-300">Gerencie contratos e gere PDF para assinatura.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">Não foi possível carregar os contratos.</div>
        </div>
      )
    }

    const eventIds = Array.from(new Set((rows ?? []).map((r) => String(r.eventId)).filter(Boolean)))
    const { data: events } =
      eventIds.length === 0
        ? { data: [] as Array<{ id: string; title: string; date: string }> }
        : await supabaseAdmin.from('Event').select('id,title,date').in('id', eventIds)
    const eventById = new Map((events ?? []).map((e) => [String(e.id), e]))

    contracts = (rows ?? []).map((c) => {
      const ev = eventById.get(String(c.eventId))
      return {
        id: String(c.id),
        status: c.status as 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED',
        totalAmount: Number(c.totalAmount) || 0,
        event: { title: ev?.title ? String(ev.title) : 'Evento', date: ev?.date ? new Date(String(ev.date)) : new Date() },
      }
    })
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
        <p className="mt-1 text-sm text-zinc-300">Gerencie contratos e gere PDF para assinatura.</p>
      </div>

      <div className="grid gap-3">
        {contracts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            Nenhum contrato criado.
          </div>
        ) : (
          contracts.map((c) => (
            <Link
              key={c.id}
              href={`/admin/contracts/${c.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold">{c.event.title}</div>
                  <div className="text-sm text-zinc-300">{formatDateBR(c.event.date)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-zinc-300">{contractStatusLabel(c.status)}</div>
                  <div className="text-sm font-semibold">{formatCurrencyBRL(c.totalAmount)}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
