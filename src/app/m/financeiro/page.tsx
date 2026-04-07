import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { paymentStatusLabel } from '@/lib/labels'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function MusicianFinanceiroPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const profile = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) redirect('/m/agenda')

  const assignments = await prisma.assignment.findMany({
    where: { musicianId: profile.id },
    select: { eventId: true },
  })

  const eventIds = assignments.map((a) => a.eventId)
  const payments =
    eventIds.length === 0
      ? []
      : await prisma.payment.findMany({
          where: { eventId: { in: eventIds }, direction: 'PAYABLE' },
          include: { event: true },
          orderBy: { createdAt: 'desc' },
        })

  const total = payments.reduce((sum, p) => sum + p.amount, 0)
  const pending = payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-zinc-300">Cachês por evento e status de pagamento.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">Total</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(total)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-300">Pendente</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrencyBRL(pending)}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Lançamentos</h2>
        <div className="mt-4 grid gap-3">
          {payments.length === 0 ? (
            <div className="text-sm text-zinc-300">Nenhum lançamento.</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.event.title}</div>
                    <div className="mt-1 text-sm text-zinc-300">{formatDateBR(p.event.date)}</div>
                    <div className="mt-1 text-sm text-zinc-400">Status: {paymentStatusLabel(p.status)}</div>
                    {p.note ? <div className="mt-1 text-sm text-zinc-400">{p.note}</div> : null}
                  </div>
                  <div className="text-sm font-semibold text-zinc-50">{formatCurrencyBRL(p.amount)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
