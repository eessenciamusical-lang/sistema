import { prisma } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoContracts, demoEvents } from '@/lib/demo-data'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { contractStatusLabel } from '@/lib/labels'
import { syncContractFinance } from '@/lib/finance-sync'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type Props = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseBRLToCents(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

export default async function AdminContractDetailPage({ params }: Props) {
  const { id } = await params
  const dbOk = await isDbAvailable()

  const contract = !dbOk
    ? (() => {
        const c = demoContracts().find((x) => x.id === id)
        if (!c) return null
        const ev = demoEvents().find((e) => e.id === c.eventId)
        return {
          id: c.id,
          status: c.status,
          totalAmount: c.totalAmount,
          terms: '',
          event: {
            title: ev?.title ?? c.eventTitle,
            date: ev?.date ?? new Date(),
            client: ev?.clientName ? { name: ev.clientName } : null,
            assignments: [] as Array<{
              id: string
              roleName: string | null
              costCents: number | null
              musician: { instrument: string | null; user: { name: string } }
            }>,
          },
        }
      })()
    : await prisma.contract.findUnique({
        where: { id },
        include: { event: { include: { client: true, assignments: { include: { musician: { include: { user: true } } } } } } },
      })

  if (!contract) redirect('/admin/contracts')

  async function updateAction(formData: FormData) {
    'use server'

    const parsed = z
      .object({
        total: z.string().min(1),
        status: z.enum(['DRAFT', 'SENT', 'SIGNED', 'CANCELLED']),
        terms: z.string().optional().or(z.literal('')),
      })
      .safeParse({
        total: String(formData.get('total') ?? ''),
        status: String(formData.get('status') ?? ''),
        terms: String(formData.get('terms') ?? ''),
      })

    if (!parsed.success) redirect(`/admin/contracts/${id}`)

    const cents = parseBRLToCents(parsed.data.total)
    if (cents === null) redirect(`/admin/contracts/${id}`)

    const existing = await prisma.contract.findUnique({ where: { id }, select: { status: true, signedAt: true } })

    await prisma.contract.update({
      where: { id },
      data: {
        totalAmount: cents,
        status: parsed.data.status,
        terms: parsed.data.terms || '',
        signedAt: parsed.data.status === 'SIGNED' && existing?.signedAt == null ? new Date() : existing?.signedAt ?? null,
      },
    })

    if (parsed.data.status === 'SIGNED') {
      await syncContractFinance(id)
    }

    redirect(`/admin/contracts/${id}`)
  }

  const bandCostCents = contract.event.assignments.reduce((sum, a) => sum + (a.costCents ?? 0), 0)
  const resultCents = contract.totalAmount - bandCostCents
  const sortedAssignments = [...contract.event.assignments].sort((a, b) =>
    a.musician.user.name.localeCompare(b.musician.user.name),
  )

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/admin/contracts">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Contrato</h1>
        <div className="text-sm text-zinc-300">
          {contract.event.title} · {formatDateBR(contract.event.date)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {dbOk ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Editar</h2>
            <form action={updateAction} className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm text-zinc-200">Total (R$)</span>
                  <input
                    name="total"
                    defaultValue={(contract.totalAmount / 100).toFixed(2).replace('.', ',')}
                    className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm text-zinc-200">Status</span>
                  <select
                    name="status"
                    defaultValue={contract.status}
                    className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="SENT">Enviado</option>
                    <option value="SIGNED">Assinado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Cláusulas / termos</span>
                <textarea
                  name="terms"
                  rows={10}
                  defaultValue={contract.terms ?? ''}
                  className="rounded-xl bg-white/5 px-4 py-3 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>

              <button className="h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">
                Salvar
              </button>
            </form>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Detalhes</h2>
            <div className="mt-2 text-sm text-zinc-300">Este contrato está em modo demo (sem banco). Edição e PDF ficam indisponíveis.</div>
            <div className="mt-4 grid gap-2 text-sm text-zinc-200">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-4">
                <span className="text-zinc-400">Total</span>
                <span className="font-semibold">{formatCurrencyBRL(contract.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-4">
                <span className="text-zinc-400">Status</span>
                <span className="font-semibold">{contractStatusLabel(contract.status)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-4">
                <span className="text-zinc-400">Cliente</span>
                <span className="font-semibold">{contract.event.client?.name ?? '—'}</span>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Custo da banda</h2>
          <p className="mt-2 text-sm text-zinc-300">Custos individuais dos músicos escalados (somados no custo do contrato).</p>

          <div className="mt-4 grid gap-2">
            {sortedAssignments.length === 0 ? (
              <div className="rounded-xl bg-black/20 p-4 text-sm text-zinc-300">Nenhum músico escalado.</div>
            ) : (
              sortedAssignments.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{a.musician.user.name}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {a.roleName || a.musician.instrument || 'Músico'}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{formatCurrencyBRL(a.costCents ?? 0)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-xl bg-black/20 p-4 text-sm text-zinc-200">
            <div className="text-zinc-400">Resumo</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Total</span>
              <span className="font-semibold">{formatCurrencyBRL(contract.totalAmount)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Custo da banda</span>
              <span className="font-semibold">{formatCurrencyBRL(bandCostCents)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Resultado</span>
              <span className="font-semibold">{formatCurrencyBRL(resultCents)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Status</span>
              <span className="font-semibold">{contractStatusLabel(contract.status)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Cliente</span>
              <span className="font-semibold">{contract.event.client?.name ?? '—'}</span>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold">PDF</h2>
            <p className="mt-2 text-sm text-zinc-300">Gere o PDF do contrato para enviar ao cliente.</p>
            <div className="mt-4 grid gap-2">
              {dbOk ? (
                <a
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10"
                  href={`/api/contracts/${contract.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir PDF
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
