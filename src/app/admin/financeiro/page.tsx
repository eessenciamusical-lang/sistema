import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { paymentStatusLabel } from '@/lib/labels'
import type { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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

function PaymentList({
  items,
  updateStatusAction,
}: {
  items: Array<{
    id: string
    direction: 'RECEIVABLE' | 'PAYABLE'
    amount: number
    status: 'PENDING' | 'RECEIVED' | 'REFUNDED' | 'PAID' | 'CANCELLED'
    note: string | null
    createdAt: Date
    paidAt: Date | null
    event: { title: string; date: Date }
  }>
  updateStatusAction: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="mt-4 grid gap-3">
      {items.length === 0 ? (
        <div className="text-sm text-zinc-300">Nenhum lançamento.</div>
      ) : (
        items.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold">{p.event.title}</div>
                <div className="mt-1 text-sm text-zinc-300">{formatDateBR(p.event.date)}</div>
                <div className="mt-2 text-sm text-zinc-300">
                  Status: <span className="text-zinc-50">{paymentStatusLabel(p.status)}</span>
                </div>
                {p.note ? <div className="mt-1 text-sm text-zinc-400">{p.note}</div> : null}
                <div className="mt-1 text-xs text-zinc-400">
                  Lançado em: {formatDateBR(p.createdAt)}
                  {p.paidAt ? ` · Baixado em: ${formatDateBR(p.paidAt)}` : ''}
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="text-lg font-semibold">{formatCurrencyBRL(p.amount)}</div>
                <form action={updateStatusAction} className="grid w-full gap-2 sm:w-auto sm:grid-cols-[1fr_auto] sm:items-center">
                  <input type="hidden" name="id" value={p.id} />
                  <select
                    name="status"
                    defaultValue={p.status}
                    className="h-10 w-full rounded-xl bg-white/5 px-3 text-sm text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40 sm:w-[190px]"
                  >
                    <option value="PENDING">Pendente</option>
                    {p.direction === 'RECEIVABLE' ? <option value="RECEIVED">Recebido</option> : <option value="PAID">Pago</option>}
                    {p.direction === 'RECEIVABLE' ? <option value="REFUNDED">Estornado</option> : null}
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                  <button className="h-10 rounded-xl bg-amber-300 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-200">
                    Salvar
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default async function AdminFinanceiroPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}

  const fromRaw = typeof sp.from === 'string' ? sp.from : undefined
  const toRaw = typeof sp.to === 'string' ? sp.to : undefined
  const directionRaw = typeof sp.direction === 'string' ? sp.direction : undefined
  const statusRaw = typeof sp.status === 'string' ? sp.status : undefined

  const fromDate = parseDateOnly(fromRaw)
  const toDate = parseDateOnly(toRaw)

  const where: Prisma.PaymentWhereInput = {}

  if (directionRaw === 'RECEIVABLE' || directionRaw === 'PAYABLE') where.direction = directionRaw
  if (
    statusRaw === 'PENDING' ||
    statusRaw === 'RECEIVED' ||
    statusRaw === 'REFUNDED' ||
    statusRaw === 'PAID' ||
    statusRaw === 'CANCELLED'
  )
    where.status = statusRaw

  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: toStartOfDay(fromDate) } : {}),
      ...(toDate ? { lte: toEndOfDay(toDate) } : {}),
    }
  }

  const payments = await prisma.payment.findMany({
    where,
    include: { event: true },
    orderBy: [{ createdAt: 'desc' }],
  })

  async function updateStatusAction(formData: FormData) {
    'use server'
    const parsed = z
      .object({
        id: z.string().min(1),
        status: z.enum(['PENDING', 'RECEIVED', 'REFUNDED', 'PAID', 'CANCELLED']),
      })
      .safeParse({
        id: String(formData.get('id') ?? ''),
        status: String(formData.get('status') ?? ''),
      })
    if (!parsed.success) redirect('/admin/financeiro')

    const paidAt =
      parsed.data.status === 'PAID' || parsed.data.status === 'RECEIVED' ? new Date() : parsed.data.status === 'PENDING' ? null : null

    await prisma.payment.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status, paidAt },
    })
    redirect('/admin/financeiro')
  }

  const receivables = payments.filter((p) => p.direction === 'RECEIVABLE')
  const payables = payments.filter((p) => p.direction === 'PAYABLE')

  const sumReceivable = receivables.reduce((sum, p) => sum + p.amount, 0)
  const sumPayable = payables.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Contas a receber (noivos) e a pagar (cachês). Filtre por período e exporte relatórios.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <form className="grid gap-3 sm:grid-cols-4" method="get">
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
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Direção</span>
              <select
                name="direction"
                defaultValue={directionRaw ?? ''}
                className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              >
                <option value="">Todas</option>
                <option value="RECEIVABLE">A receber</option>
                <option value="PAYABLE">A pagar</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Status</span>
              <select
                name="status"
                defaultValue={statusRaw ?? ''}
                className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="RECEIVED">Recebido</option>
                <option value="REFUNDED">Estornado</option>
                <option value="PAID">Pago</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
            <div className="sm:col-span-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button className="h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">
                Filtrar
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10"
                  href={`/api/reports/financeiro?format=pdf&from=${encodeURIComponent(fromRaw ?? '')}&to=${encodeURIComponent(
                    toRaw ?? '',
                  )}&direction=${encodeURIComponent(directionRaw ?? '')}&status=${encodeURIComponent(statusRaw ?? '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Exportar PDF
                </a>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10"
                  href={`/api/reports/financeiro?format=xlsx&from=${encodeURIComponent(fromRaw ?? '')}&to=${encodeURIComponent(
                    toRaw ?? '',
                  )}&direction=${encodeURIComponent(directionRaw ?? '')}&status=${encodeURIComponent(statusRaw ?? '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Exportar Excel
                </a>
              </div>
            </div>
          </form>

          <div className="grid gap-2 text-sm text-zinc-200">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">A receber (período)</span>
              <span className="font-semibold">{formatCurrencyBRL(sumReceivable)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">A pagar (período)</span>
              <span className="font-semibold">{formatCurrencyBRL(sumPayable)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">A receber</h2>
          <PaymentList items={receivables} updateStatusAction={updateStatusAction} />
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">A pagar (cachês)</h2>
          <PaymentList items={payables} updateStatusAction={updateStatusAction} />
        </section>
      </div>
    </div>
  )
}
