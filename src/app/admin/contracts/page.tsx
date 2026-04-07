import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { contractStatusLabel } from '@/lib/labels'
import Link from 'next/link'

export default async function AdminContractsPage() {
  const contracts = await prisma.contract.findMany({
    include: { event: true },
    orderBy: { updatedAt: 'desc' },
  })

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
