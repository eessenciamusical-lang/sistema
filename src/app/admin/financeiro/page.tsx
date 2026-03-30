import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { redirect } from 'next/navigation'
import { z } from 'zod'

function PaymentList({
  items,
  markPaidAction,
}: {
  items: Array<{
    id: string
    direction: string
    amount: number
    status: string
    note: string | null
    event: { title: string; date: Date }
  }>
  markPaidAction: (formData: FormData) => Promise<void>
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
                  Status: <span className="text-zinc-50">{p.status}</span>
                </div>
                {p.note ? <div className="mt-1 text-sm text-zinc-400">{p.note}</div> : null}
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="text-lg font-semibold">{formatCurrencyBRL(p.amount)}</div>
                {p.status !== 'PAID' ? (
                  <form action={markPaidAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="h-10 rounded-xl bg-amber-300 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-200">
                      Marcar como pago
                    </button>
                  </form>
                ) : (
                  <div className="text-sm text-emerald-200/90">Pago</div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default async function AdminFinanceiroPage() {
  const payments = await prisma.payment.findMany({
    include: { event: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  async function markPaidAction(formData: FormData) {
    'use server'
    const parsed = z.object({ id: z.string().min(1) }).safeParse({ id: String(formData.get('id') ?? '') })
    if (!parsed.success) redirect('/admin/financeiro')

    await prisma.payment.update({
      where: { id: parsed.data.id },
      data: { status: 'PAID', paidAt: new Date() },
    })
    redirect('/admin/financeiro')
  }

  const receivables = payments.filter((p) => p.direction === 'RECEIVABLE')
  const payables = payments.filter((p) => p.direction === 'PAYABLE')

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-zinc-300">Contas a receber (noivos) e a pagar (cachês).</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">A receber</h2>
          <PaymentList items={receivables} markPaidAction={markPaidAction} />
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">A pagar (cachês)</h2>
          <PaymentList items={payables} markPaidAction={markPaidAction} />
        </section>
      </div>
    </div>
  )
}
