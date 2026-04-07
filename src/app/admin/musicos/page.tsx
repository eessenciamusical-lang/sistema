import { prisma } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoMusicians } from '@/lib/demo-data'
import { formatCurrencyBRL } from '@/lib/format'
import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export default async function AdminMusicosPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''
  const instrument = typeof sp.instrument === 'string' ? sp.instrument.trim() : ''
  const minCache = typeof sp.min === 'string' ? Number(sp.min) : undefined
  const maxCache = typeof sp.max === 'string' ? Number(sp.max) : undefined

  const where: Prisma.MusicianProfileWhereInput = {}
  if (q) where.user = { is: { OR: [{ name: { contains: q } }, { login: { contains: q.toLowerCase() } }] } }
  if (instrument) where.instrument = { contains: instrument }
  if (minCache || maxCache) where.baseCacheCents = { ...(minCache ? { gte: Math.round(minCache * 100) } : {}), ...(maxCache ? { lte: Math.round(maxCache * 100) } : {}) }

  const dbOk = await isDbAvailable()
  let musicians:
    | Array<{
        id: string
        userId: string
        user: { name: string; login: string | null }
        instrument: string | null
        baseCacheCents: number
        active: boolean
        lastSeen: Date | null
        assignments: Array<{ event: { contract: { status: string } | null } }>
      }>
    | [] = []

  if (!dbOk) {
    const demo = demoMusicians()
    musicians = demo.map((m) => ({
      id: m.id,
      userId: m.id,
      user: { name: m.name, login: null },
      instrument: m.instrument,
      baseCacheCents: m.baseCacheCents,
      active: true,
      lastSeen: null,
      assignments: [],
    }))
  } else {
    musicians = await prisma.musicianProfile.findMany({
      where,
      include: {
        user: true,
        assignments: {
          where: { event: { date: { gte: new Date() } } },
          include: { event: { include: { contract: true } } },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })
  }

  async function toggleActiveAction(formData: FormData) {
    'use server'
    const parsed = z.object({ id: z.string().min(1), active: z.string() }).safeParse({
      id: String(formData.get('id') ?? ''),
      active: String(formData.get('active') ?? ''),
    })
    if (!parsed.success) redirect('/admin/musicos')
    await prisma.musicianProfile.update({ where: { id: parsed.data.id }, data: { active: parsed.data.active === 'true' } })
    revalidatePath('/admin/musicos')
    redirect('/admin/musicos')
  }

  async function resetPinAction(formData: FormData) {
    'use server'
    const parsed = z.object({ id: z.string().min(1), pin: z.string().regex(/^\d{4}$/) }).safeParse({
      id: String(formData.get('id') ?? ''),
      pin: String(formData.get('pin') ?? '').trim(),
    })
    if (!parsed.success) redirect('/admin/musicos')
    await prisma.user.update({ where: { id: parsed.data.id }, data: { passwordHash: await bcrypt.hash(parsed.data.pin, 10) } })
    revalidatePath('/admin/musicos')
    redirect('/admin/musicos')
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Músicos</h1>
          <p className="mt-1 text-sm text-zinc-300">Gerencie cadastro, status e senha.</p>
        </div>
        <a
          href="/admin/musicos/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
        >
          Novo músico
        </a>
      </div>

      <form className="grid gap-3 sm:grid-cols-4" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou login"
          className="h-11 rounded-xl bg-white/5 px-4 text-sm text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
        />
        <input
          name="instrument"
          defaultValue={instrument}
          placeholder="Instrumento"
          className="h-11 rounded-xl bg-white/5 px-4 text-sm text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
        />
        <input
          name="min"
          placeholder="Cachê mín (R$)"
          className="h-11 rounded-xl bg-white/5 px-4 text-sm text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
        />
        <input
          name="max"
          placeholder="Cachê máx (R$)"
          className="h-11 rounded-xl bg-white/5 px-4 text-sm text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
        />
        <div className="sm:col-span-4">
          <button className="h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Filtrar</button>
        </div>
      </form>

      <div className="grid gap-3">
        {musicians.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">Nenhum músico encontrado.</div>
        ) : (
          musicians.map((m) => {
            const now = new Date()
            const online = m.lastSeen && now.getTime() - new Date(m.lastSeen).getTime() < 120000
            const activeContracts = m.assignments.filter((a) => a.event.contract?.status === 'SIGNED').length
            return (
              <div key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold">{m.user.name}</div>
                    <div className="text-sm text-zinc-300">Login: {m.user.login ?? '—'}</div>
                    <div className="mt-1 text-sm text-zinc-300">
                      Instrumento: {m.instrument || '—'} · Cachê base: {formatCurrencyBRL(m.baseCacheCents)} ·{' '}
                      Contratos ativos: {activeContracts}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                    <span className="text-sm">{online ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dbOk ? (
                    <>
                      <a
                        href={`/admin/musicos/${m.id}/edit`}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm hover:bg-white/10"
                      >
                        Editar
                      </a>
                      <form action={toggleActiveAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="active" value={(!m.active).toString()} />
                        <button className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm hover:bg-white/10">
                          {m.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </form>
                      <details>
                        <summary className="cursor-pointer text-sm text-amber-200/90">Redefinir PIN</summary>
                        <form action={resetPinAction} className="mt-2 flex items-center gap-2">
                          <input type="hidden" name="id" value={m.userId} />
                          <input
                            name="pin"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0000"
                            className="h-10 rounded-lg bg-white/5 px-3 text-sm text-zinc-50 ring-1 ring-white/10"
                          />
                          <button className="h-10 rounded-xl bg-amber-300 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-200">
                            Salvar
                          </button>
                        </form>
                      </details>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
