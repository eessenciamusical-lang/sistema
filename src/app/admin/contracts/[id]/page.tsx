import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type Props = {
  params: Promise<{ id: string }>
}

function parseBRLToCents(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

export default async function AdminContractDetailPage({ params }: Props) {
  const { id } = await params
  const contract = await prisma.contract.findUnique({
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

    await prisma.contract.update({
      where: { id },
      data: { totalAmount: cents, status: parsed.data.status, terms: parsed.data.terms || null },
    })

    redirect(`/admin/contracts/${id}`)
  }

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
                  <option value="DRAFT">DRAFT</option>
                  <option value="SENT">SENT</option>
                  <option value="SIGNED">SIGNED</option>
                  <option value="CANCELLED">CANCELLED</option>
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

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">PDF</h2>
          <p className="mt-2 text-sm text-zinc-300">Gere o PDF do contrato para enviar ao cliente.</p>
          <div className="mt-4 grid gap-2">
            <a
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10"
              href={`/api/contracts/${contract.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir PDF
            </a>
          </div>

          <div className="mt-6 rounded-xl bg-black/20 p-4 text-sm text-zinc-200">
            <div className="text-zinc-400">Resumo</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Total</span>
              <span className="font-semibold">{formatCurrencyBRL(contract.totalAmount)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Status</span>
              <span className="font-semibold">{contract.status}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Cliente</span>
              <span className="font-semibold">{contract.event.client?.name ?? '—'}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
