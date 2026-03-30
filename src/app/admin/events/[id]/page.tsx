import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/format'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AdminEventDetailPage({ params }: Props) {
  const { id } = await params

  const [event, musicians, payments] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        client: true,
        assignments: { include: { musician: { include: { user: true } } }, orderBy: { createdAt: 'asc' } },
        contract: true,
      },
    }),
    prisma.musicianProfile.findMany({ include: { user: true }, orderBy: { user: { name: 'asc' } } }),
    prisma.payment.findMany({ where: { eventId: id }, orderBy: { createdAt: 'desc' } }),
  ])

  if (!event) redirect('/admin/events')

  async function addMusicianAction(formData: FormData) {
    'use server'

    const parsed = z
      .object({
        musicianId: z.string().min(1),
        roleName: z.string().optional().or(z.literal('')),
      })
      .safeParse({
        musicianId: String(formData.get('musicianId') ?? ''),
        roleName: String(formData.get('roleName') ?? '').trim(),
      })

    if (!parsed.success) redirect(`/admin/events/${id}`)

    await prisma.assignment.upsert({
      where: { eventId_musicianId: { eventId: id, musicianId: parsed.data.musicianId } },
      update: { roleName: parsed.data.roleName || null, status: 'CONFIRMED' },
      create: { eventId: id, musicianId: parsed.data.musicianId, roleName: parsed.data.roleName || null },
    })

    redirect(`/admin/events/${id}`)
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/admin/events">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
        <div className="text-sm text-zinc-300">
          {formatDateTimeBR(event.date)}
          {event.client?.name ? ` · ${event.client.name}` : ''}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Detalhes do evento</h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-200">
            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-zinc-400">Local</div>
              <div className="mt-1 font-medium">{event.locationName || '—'}</div>
              <div className="mt-1 text-zinc-300">
                {[event.address, event.city, event.state].filter(Boolean).join(' · ') || '—'}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {event.mapUrl ? (
                  <a
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm hover:bg-white/10"
                    target="_blank"
                    rel="noreferrer"
                    href={event.mapUrl}
                  >
                    Abrir mapa
                  </a>
                ) : null}
                {event.contract?.id ? (
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm hover:bg-white/10"
                    href={`/admin/contracts/${event.contract.id}`}
                  >
                    Contrato
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-black/20 p-4">
                <div className="text-zinc-400">Cronograma</div>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{event.timeline || '—'}</pre>
              </div>
              <div className="rounded-xl bg-black/20 p-4">
                <div className="text-zinc-400">Repertório</div>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{event.repertoire || '—'}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Escalar músico</h2>
          <form action={addMusicianAction} className="mt-4 grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Músico</span>
              <select
                name="musicianId"
                required
                className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              >
                <option value="">Selecione</option>
                {musicians.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user.name} {m.instrument ? `(${m.instrument})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Função (opcional)</span>
              <input
                name="roleName"
                className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                placeholder="Voz, violão, violino..."
              />
            </label>
            <button className="mt-1 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">
              Adicionar
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Músicos escalados</h2>
          <div className="mt-4 grid gap-3">
            {event.assignments.length === 0 ? (
              <div className="text-sm text-zinc-300">Nenhum músico escalado.</div>
            ) : (
              event.assignments.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{a.musician.user.name}</div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {(a.roleName || a.musician.instrument || 'Músico').toString()}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-300">{a.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Financeiro do evento</h2>
          <div className="mt-4 grid gap-3">
            {payments.length === 0 ? (
              <div className="text-sm text-zinc-300">Nenhum lançamento.</div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{p.direction === 'RECEIVABLE' ? 'A receber' : 'A pagar'}</div>
                      <div className="mt-1 text-sm text-zinc-300">Status: {p.status}</div>
                      {p.note ? <div className="mt-1 text-sm text-zinc-400">{p.note}</div> : null}
                    </div>
                    <div className="text-sm text-zinc-50">{formatCurrencyBRL(p.amount)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
