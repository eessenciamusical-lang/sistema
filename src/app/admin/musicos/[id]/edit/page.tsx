import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

function parseMoneyBR(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

type Props = { params: Promise<{ id: string }> }

export default async function EditMusicianPage({ params }: Props) {
  const { id } = await params
  const m = await prisma.musicianProfile.findUnique({ where: { id }, include: { user: true } })
  if (!m) redirect('/admin/musicos')

  async function updateAction(formData: FormData) {
    'use server'
    const parsed = z
      .object({
        name: z.string().min(2),
        login: z.string().min(3),
        phone: z.string().optional().or(z.literal('')),
        instrument: z.string().optional().or(z.literal('')),
        cache: z.string().min(1),
        active: z.enum(['true', 'false']),
      })
      .safeParse({
        name: String(formData.get('name') ?? ''),
        login: String(formData.get('login') ?? '').trim().toLowerCase(),
        phone: String(formData.get('phone') ?? ''),
        instrument: String(formData.get('instrument') ?? ''),
        cache: String(formData.get('cache') ?? ''),
        active: String(formData.get('active') ?? 'true'),
      })
    if (!parsed.success) redirect(`/admin/musicos/${id}/edit`)
    const cents = parseMoneyBR(parsed.data.cache)
    if (cents === null) redirect(`/admin/musicos/${id}/edit`)

    const existing = await prisma.user.findFirst({
      where: { login: parsed.data.login, id: { not: m!.userId } },
      select: { id: true },
    })
    if (existing) redirect(`/admin/musicos/${id}/edit`)

    await prisma.user.update({
      where: { id: m!.userId },
      data: { name: parsed.data.name, login: parsed.data.login, email: null },
    })
    await prisma.musicianProfile.update({
      where: { id },
      data: {
        phone: parsed.data.phone || null,
        instrument: parsed.data.instrument || null,
        baseCacheCents: cents,
        active: parsed.data.active === 'true',
      },
    })
    revalidatePath('/admin/musicos')
    redirect('/admin/musicos')
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Editar músico</h1>
      <form action={updateAction} className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Nome</span>
          <input name="name" defaultValue={m.user.name} className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Login</span>
          <input name="login" defaultValue={m.user.login ?? ''} className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Cachê (R$)</span>
            <input
              name="cache"
              defaultValue={(m.baseCacheCents / 100).toFixed(2).replace('.', ',')}
              className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Telefone</span>
            <input name="phone" defaultValue={m.phone ?? ''} className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Instrumento</span>
            <input
              name="instrument"
              defaultValue={m.instrument ?? ''}
              className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Status</span>
            <select name="active" defaultValue={String(m.active)} className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
        </div>
        <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Salvar</button>
      </form>
    </div>
  )
}
