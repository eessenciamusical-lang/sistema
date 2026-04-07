import { prisma } from '@/lib/db'
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/format'
import { paymentStatusLabel } from '@/lib/labels'
import { syncContractFinance } from '@/lib/finance-sync'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
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
        cost: z.string().optional().or(z.literal('')),
      })
      .safeParse({
        musicianId: String(formData.get('musicianId') ?? ''),
        roleName: String(formData.get('roleName') ?? '').trim(),
        cost: String(formData.get('cost') ?? '').trim(),
      })

    if (!parsed.success) redirect(`/admin/events/${id}`)

    const costCents = parsed.data.cost ? parseBRLToCents(parsed.data.cost) : 0
    if (costCents === null) redirect(`/admin/events/${id}`)

    await prisma.assignment.upsert({
      where: { eventId_musicianId: { eventId: id, musicianId: parsed.data.musicianId } },
      update: { roleName: parsed.data.roleName || null, status: 'CONFIRMED', costCents },
      create: { eventId: id, musicianId: parsed.data.musicianId, roleName: parsed.data.roleName || null, costCents },
    })

    const contract = await prisma.contract.findUnique({ where: { eventId: id }, select: { id: true, status: true } })
    if (contract?.status === 'SIGNED') await syncContractFinance(contract.id)

    revalidatePath(`/admin/events/${id}`)
    redirect(`/admin/events/${id}`)
  }

  async function updateAssignmentCostAction(formData: FormData) {
    'use server'

    const parsed = z
      .object({
        assignmentId: z.string().min(1),
        cost: z.string().min(1),
      })
      .safeParse({
        assignmentId: String(formData.get('assignmentId') ?? ''),
        cost: String(formData.get('cost') ?? ''),
      })

    if (!parsed.success) redirect(`/admin/events/${id}`)

    const costCents = parseBRLToCents(parsed.data.cost)
    if (costCents === null) redirect(`/admin/events/${id}`)

    await prisma.assignment.update({
      where: { id: parsed.data.assignmentId },
      data: { costCents },
    })

    const contract = await prisma.contract.findUnique({ where: { eventId: id }, select: { id: true, status: true } })
    if (contract?.status === 'SIGNED') await syncContractFinance(contract.id)

    revalidatePath(`/admin/events/${id}`)
    redirect(`/admin/events/${id}`)
  }

  async function addManyMusiciansAction(formData: FormData) {
    'use server'

    const entries = Array.from(formData.entries())
    const byId = new Map<string, { selected?: boolean; cost?: string; role?: string }>()
    for (const [k, v] of entries) {
      const m = k.match(/^m\.(.+)\.(selected|cost|role)$/)
      if (!m) continue
      const musicianId = m[1]
      const key = m[2]
      const rec = byId.get(musicianId) ?? {}
      if (key === 'selected') rec.selected = true
      if (key === 'cost') rec.cost = String(v)
      if (key === 'role') rec.role = String(v)
      byId.set(musicianId, rec)
    }

    for (const [musicianId, rec] of byId) {
      if (!rec.selected) continue
      const cents = rec.cost ? parseBRLToCents(rec.cost) : 0
      if (cents === null) continue
      await prisma.assignment.upsert({
        where: { eventId_musicianId: { eventId: id, musicianId } },
        update: { roleName: rec.role || null, status: 'CONFIRMED', costCents: cents },
        create: { eventId: id, musicianId, roleName: rec.role || null, costCents: cents },
      })
    }

    const contract = await prisma.contract.findUnique({ where: { eventId: id }, select: { id: true, status: true } })
    if (contract?.status === 'SIGNED') await syncContractFinance(contract.id)

    revalidatePath(`/admin/events/${id}`)
    redirect(`/admin/events/${id}`)
  }

  const bandCostCents = event.assignments.reduce((sum, a) => sum + (a.costCents ?? 0), 0)

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
        <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
          <span className="text-zinc-400">Custo total da banda</span>
          <span className="font-semibold">{formatCurrencyBRL(bandCostCents)}</span>
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
              <span className="text-sm text-zinc-200">Custo do músico (R$)</span>
              <input
                name="cost"
                className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                placeholder="0,00"
              />
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

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Adicionar vários músicos</h2>
          <form action={addManyMusiciansAction} className="mt-4 grid gap-3">
            <div className="grid gap-2">
              {musicians.map((m) => (
                <div key={m.id} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-[auto,1fr,1fr] sm:items-end">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" name={`m.${m.id}.selected`} className="h-4 w-4" />
                    <span className="text-sm">
                      {m.user.name} {m.instrument ? `(${m.instrument})` : ''}
                    </span>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-zinc-400">Custo (R$)</span>
                    <input name={`m.${m.id}.cost`} placeholder="0,00" className="h-10 rounded-lg bg-white/5 px-3 text-zinc-50 ring-1 ring-white/10" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-zinc-400">Função</span>
                    <input name={`m.${m.id}.role`} placeholder="Voz, violino..." className="h-10 rounded-lg bg-white/5 px-3 text-zinc-50 ring-1 ring-white/10" />
                  </label>
                </div>
              ))}
            </div>
            <button className="h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Adicionar selecionados</button>
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
                      <div className="mt-2 text-sm text-zinc-300">
                        Custo: <span className="text-zinc-50">{formatCurrencyBRL(a.costCents ?? 0)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-300">{a.status}</div>
                  </div>

                  <form action={updateAssignmentCostAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <label className="grid gap-2">
                      <span className="text-sm text-zinc-200">Atualizar custo (R$)</span>
                      <input
                        name="cost"
                        defaultValue={((a.costCents ?? 0) / 100).toFixed(2).replace('.', ',')}
                        className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                      />
                    </label>
                    <button className="h-11 rounded-xl bg-white/5 px-5 text-sm font-medium text-zinc-50 hover:bg-white/10">
                      Salvar
                    </button>
                  </form>
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
                      <div className="mt-1 text-sm text-zinc-300">Status: {paymentStatusLabel(p.status)}</div>
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
