import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function randomNumericPin(len: number) {
  const digits = Array.from({ length: len }, () => Math.floor(Math.random() * 10))
  if (digits[0] === 0) digits[0] = 1
  return digits.join('')
}

export default async function AdminUsuariosNewPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/login')

  async function createAction(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

    const parsed = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().regex(/^\d{4,8}$/),
        role: z.enum(['ADMIN', 'MUSICIAN']),
        active: z.enum(['true', 'false']).optional(),
      })
      .safeParse({
        name: String(formData.get('name') ?? '').trim(),
        email: String(formData.get('email') ?? '').trim().toLowerCase(),
        password: String(formData.get('password') ?? '').trim(),
        role: String(formData.get('role') ?? ''),
        active: String(formData.get('active') ?? 'true'),
      })
    if (!parsed.success) redirect('/admin/usuarios/new?error=invalid')

    const login = parsed.data.email.split('@')[0] || parsed.data.email
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    const { data: created, error } = await supabaseAdmin
      .from('User')
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        login,
        role: parsed.data.role,
        active: parsed.data.active !== 'false',
        passwordHash,
      })
      .select('id')
      .single()

    if (error || !created) redirect('/admin/usuarios/new?error=server')

    await auditLog({
      actorUserId: session.user.id,
      action: 'user.create',
      targetUserId: String(created.id),
      targetType: 'User',
      metadata: { role: parsed.data.role, active: parsed.data.active !== 'false', login, email: parsed.data.email },
    })

    redirect('/admin/usuarios')
  }

  const defaultPin = randomNumericPin(8)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/admin/usuarios">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Novo usuário</h1>
        </div>
      </div>

      <form action={createAction} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Nome</span>
          <input name="name" required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Email</span>
          <input name="email" type="email" required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Senha (4 a 8 dígitos numéricos)</span>
          <input
            name="password"
            required
            inputMode="numeric"
            pattern="\\d{4,8}"
            defaultValue={defaultPin}
            className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Tipo</span>
            <select name="role" defaultValue="MUSICIAN" className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="ADMIN">Administrador</option>
              <option value="MUSICIAN">Músico</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Status</span>
            <select name="active" defaultValue="true" className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="true">Ativo</option>
              <option value="false">Desativado</option>
            </select>
          </label>
        </div>

        <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Criar</button>
      </form>
    </div>
  )
}

