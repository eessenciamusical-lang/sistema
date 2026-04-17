import { supabaseAdmin } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoRestaurantContracts } from '@/lib/demo-data'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RestaurantesPage() {
  const dbOk = await isDbAvailable()
  let contracts:
    | Array<{
        id: string
        restaurant: { name: string }
        startDate: Date
        endDate: Date
        paymentFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
        receivableTotalCents: number
        totalCents: number
        status: 'ACTIVE' | 'ENDED' | 'CANCELLED'
        events: Array<{ payments: Array<{ status: string; direction: string }> }>
      }>
    | [] = []

  if (!dbOk) {
    contracts = demoRestaurantContracts().map((c) => ({
      id: c.id,
      restaurant: { name: c.restaurantName },
      startDate: c.startDate,
      endDate: c.endDate,
      paymentFrequency: c.paymentFrequency,
      receivableTotalCents: c.receivableTotalCents,
      totalCents: c.totalCents,
      status: c.status,
      events: [],
    }))
  } else {
    const { data: rows, error } = await supabaseAdmin
      .from('RestaurantContract')
      .select('id,restaurantId,startDate,endDate,paymentFrequency,receivableTotalCents,totalCents,status')
      .order('startDate', { ascending: false })
    if (error) {
      contracts = []
    } else {
      const restaurantIds = Array.from(new Set((rows ?? []).map((c) => String(c.restaurantId)).filter(Boolean)))
      const { data: restaurants } =
        restaurantIds.length === 0 ? { data: [] as Array<{ id: string; name: string }> } : await supabaseAdmin.from('Restaurant').select('id,name').in('id', restaurantIds)
      const restaurantById = new Map((restaurants ?? []).map((r) => [String(r.id), r]))

      const contractIds = Array.from(new Set((rows ?? []).map((c) => String(c.id))))
      const { data: pending } =
        contractIds.length === 0
          ? { data: [] as Array<{ restaurantContractId: string | null }> }
          : await supabaseAdmin.from('Payment').select('restaurantContractId').eq('status', 'PENDING').in('restaurantContractId', contractIds)
      const pendingByContract = new Map<string, number>()
      for (const p of pending ?? []) {
        if (!p.restaurantContractId) continue
        const key = String(p.restaurantContractId)
        pendingByContract.set(key, (pendingByContract.get(key) ?? 0) + 1)
      }

      contracts = (rows ?? []).map((c) => ({
        id: String(c.id),
        restaurant: { name: restaurantById.get(String(c.restaurantId))?.name ? String(restaurantById.get(String(c.restaurantId))?.name) : 'Restaurante' },
        startDate: new Date(String(c.startDate)),
        endDate: new Date(String(c.endDate)),
        paymentFrequency: c.paymentFrequency as 'DAILY' | 'WEEKLY' | 'MONTHLY',
        receivableTotalCents: Number(c.receivableTotalCents) || 0,
        totalCents: Number(c.totalCents) || 0,
        status: c.status as 'ACTIVE' | 'ENDED' | 'CANCELLED',
        events: Array.from({ length: pendingByContract.get(String(c.id)) ?? 0 }).map(() => ({ payments: [{ status: 'PENDING', direction: 'RECEIVABLE' }] })),
      }))
    }
  }

  const now = new Date()

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Restaurantes</h1>
          <p className="mt-1 text-sm text-zinc-300">Contratos fixos mensais com apresentações diárias.</p>
        </div>
        <Link
          href="/admin/restaurantes/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
        >
          Novo contrato
        </Link>
      </div>

      <div className="grid gap-3">
        {contracts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            Nenhum contrato cadastrado.
          </div>
        ) : (
          contracts.map((c) => {
            const endsInDays = Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            const expiring = c.status === 'ACTIVE' && endsInDays >= 0 && endsInDays <= 7
            const pendingPayments = c.events
              .flatMap((e) => e.payments)
              .filter((p) => p.status === 'PENDING')
              .length
            return (
              <Link
                key={c.id}
                href={`/admin/restaurantes/${c.id}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold">{c.restaurant.name}</div>
                    <div className="mt-1 text-sm text-zinc-300">
                      {formatDateBR(c.startDate)} → {formatDateBR(c.endDate)} · Pagamento: {c.paymentFrequency}
                    </div>
                    <div className="mt-2 text-sm text-zinc-200">
                      Valor a receber: {formatCurrencyBRL(c.receivableTotalCents)} · Custo (calculado): {formatCurrencyBRL(c.totalCents)}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="text-sm text-zinc-200">Status: {c.status}</div>
                    <div className="text-sm text-zinc-300">Pendências: {pendingPayments}</div>
                    {expiring ? (
                      <div className="rounded-lg bg-amber-300/20 px-3 py-1 text-xs text-amber-200">
                        Vence em {endsInDays} dia(s)
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
