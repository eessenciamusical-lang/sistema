import { supabaseAdmin } from '@/lib/db'
import { newId } from '@/lib/ids'
import bcrypt from 'bcryptjs'
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

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewMusicianPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {}
  const error = typeof sp?.error === 'string' ? sp.error : ''

  const errorMessage =
    error === 'login'
      ? 'Este login já está em uso.'
      : error === 'pin'
        ? 'O PIN deve ter exatamente 4 dígitos numéricos.'
        : error === 'cache'
          ? 'Informe um cachê válido (ex.: 250,00).'
          : error === 'invalid'
            ? 'Preencha todos os campos obrigatórios corretamente.'
            : error === 'server'
              ? 'Não foi possível salvar. Tente novamente.'
              : ''

  async function createAction(formData: FormData) {
    'use server'
    const parsed = z
      .object({
        name: z.string().min(2),
        login: z.string().min(3),
        pin: z.string().regex(/^\d{4}$/),
        phone: z.string().optional().or(z.literal('')),
        instrument: z.string().optional().or(z.literal('')),
        cache: z.string().min(1),
        active: z.enum(['true', 'false']),
      })
      .safeParse({
        name: String(formData.get('name') ?? ''),
        login: String(formData.get('login') ?? '').trim().toLowerCase(),
        pin: String(formData.get('pin') ?? '').trim(),
        phone: String(formData.get('phone') ?? ''),
        instrument: String(formData.get('instrument') ?? ''),
        cache: String(formData.get('cache') ?? ''),
        active: String(formData.get('active') ?? 'true'),
      })

    if (!parsed.success) redirect('/admin/musicos/new?error=invalid')

    const { data: exists } = await supabaseAdmin.from('User').select('id').eq('login', parsed.data.login).maybeSingle()
    if (exists) redirect('/admin/musicos/new?error=login')

    const cents = parseMoneyBR(parsed.data.cache)
    if (cents === null) redirect('/admin/musicos/new?error=cache')

    try {
      const { data: user, error: userErr } = await supabaseAdmin
        .from('User')
        .insert({
          id: newId(),
          login: parsed.data.login,
          email: null,
          name: parsed.data.name,
          role: 'MUSICIAN',
          passwordHash: await bcrypt.hash(parsed.data.pin, 10),
        })
        .select('id')
        .single()
      if (userErr || !user) redirect('/admin/musicos/new?error=server')

      const { error: profileErr } = await supabaseAdmin.from('MusicianProfile').insert({
        id: newId(),
        userId: user.id,
        phone: parsed.data.phone || null,
        instrument: parsed.data.instrument || null,
        baseCacheCents: cents,
        active: parsed.data.active === 'true',
      })
      if (profileErr) redirect('/admin/musicos/new?error=server')
    } catch {
      redirect('/admin/musicos/new?error=server')
    }

    revalidatePath('/admin/musicos')
    redirect('/admin/musicos')
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Novo músico</h1>
      <p className="mt-1 text-sm text-zinc-300">Preencha os dados obrigatórios. Login deve ser único.</p>
      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <form action={createAction} className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Nome completo</span>
          <input name="name" required className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Login</span>
          <input name="login" required className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" placeholder="ex.: joaosilva" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">PIN (4 dígitos)</span>
          <input name="pin" type="password" inputMode="numeric" pattern="[0-9]*" required className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" placeholder="0000" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Cachê (R$)</span>
            <input name="cache" placeholder="0,00" required className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Telefone</span>
            <input name="phone" className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Instrumento</span>
            <input name="instrument" className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Status</span>
            <select name="active" className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 ring-1 ring-white/10">
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
