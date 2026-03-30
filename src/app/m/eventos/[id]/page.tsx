import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/format'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function MusicianEventoDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const profile = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) redirect('/m/agenda')

  const assignment = await prisma.assignment.findUnique({
    where: { eventId_musicianId: { eventId: id, musicianId: profile.id } },
    include: { event: true },
  })

  if (!assignment) redirect('/m/eventos')

  const payables = await prisma.payment.findMany({
    where: { eventId: id, direction: 'PAYABLE' },
    orderBy: { createdAt: 'desc' },
  })

  const totalPayable = payables.reduce((sum, p) => sum + p.amount, 0)
  const anyUnpaid = payables.some((p) => p.status !== 'PAID')

  const locationLine = [assignment.event.locationName, assignment.event.address, assignment.event.city, assignment.event.state]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/m/eventos">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{assignment.event.title}</h1>
        <div className="text-sm text-zinc-300">{formatDateTimeBR(assignment.event.date)}</div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm text-zinc-300">Sua função</div>
        <div className="mt-1 text-lg font-semibold">{assignment.roleName || 'Músico'}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-black/20 p-4">
            <div className="text-sm text-zinc-300">Cachê (evento)</div>
            <div className="mt-1 text-lg font-semibold">{formatCurrencyBRL(totalPayable)}</div>
            <div className="mt-1 text-sm text-zinc-400">{anyUnpaid ? 'Pagamento pendente' : 'Pago'}</div>
          </div>
          <div className="rounded-xl bg-black/20 p-4">
            <div className="text-sm text-zinc-300">Status da escala</div>
            <div className="mt-1 text-lg font-semibold">{assignment.status}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Local</h2>
        <div className="mt-3 text-sm text-zinc-200">{locationLine || '—'}</div>
        {assignment.event.mapUrl ? (
          <a
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
            href={assignment.event.mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir no Maps
          </a>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Cronograma</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm text-zinc-200">
          {assignment.event.timeline || '—'}
        </pre>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Repertório</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm text-zinc-200">
          {assignment.event.repertoire || '—'}
        </pre>
      </section>
    </div>
  )
}
