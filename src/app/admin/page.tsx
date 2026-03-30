import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import Link from 'next/link'

export default async function AdminHome() {
  const now = new Date()
  const [events, receivables, payables, contracts] = await Promise.all([
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

  return (
    <div className="grid gap-8">
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
                      <div className="mt-1 text-sm text-zinc-300">Status: {c.status}</div>
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
