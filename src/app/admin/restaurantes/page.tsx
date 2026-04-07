import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RestaurantesPage() {
  const contracts = await prisma.restaurantContract.findMany({
    include: {
      restaurant: true,
      events: {
        select: { id: true, date: true, payments: { select: { status: true, direction: true } } },
      },
    },
    orderBy: { startDate: 'desc' },
  })

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
