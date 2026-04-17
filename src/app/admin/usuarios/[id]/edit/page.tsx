import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Props = { params: Promise<{ id: string }> }

export default async function AdminUsuariosEditPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/login')

  const { id } = await params
  const { data: user } = await supabaseAdmin.from('User').select('id,name,email,login,role,active').eq('id', id).maybeSingle()
  if (!user) redirect('/admin/usuarios')

  async function updateAction(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

    const parsed = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        role: z.enum(['ADMIN', 'MUSICIAN']),
        active: z.enum(['true', 'false']),
        password: z.string().optional(),
      })
      .safeParse({
        name: String(formData.get('name') ?? '').trim(),
        email: String(formData.get('email') ?? '').trim().toLowerCase(),
        role: String(formData.get('role') ?? ''),
        active: String(formData.get('active') ?? ''),
        password: String(formData.get('password') ?? '').trim() || undefined,
      })
    if (!parsed.success) redirect(`/admin/usuarios/${id}/edit?error=invalid`)

    if (parsed.data.password && !/^\d{4,8}$/.test(parsed.data.password)) redirect(`/admin/usuarios/${id}/edit?error=pin`)

    const patch: Record<string, unknown> = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      active: parsed.data.active === 'true',
    }

    if (parsed.data.password) patch.passwordHash = await bcrypt.hash(parsed.data.password, 10)

    await supabaseAdmin.from('User').update(patch).eq('id', id)

    await auditLog({
      actorUserId: session.user.id,
      action: 'user.update',
      targetUserId: id,
      targetType: 'User',
      metadata: { role: parsed.data.role, active: parsed.data.active === 'true', passwordChanged: Boolean(parsed.data.password) },
    })

    redirect('/admin/usuarios')
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-amber-200/90 hover:text-amber-200" href="/admin/usuarios">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Editar usuário</h1>
      </div>

      <form action={updateAction} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Nome</span>
          <input name="name" defaultValue={String(user.name)} required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={String(user.email ?? '')}
            required
            className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Nova senha (opcional, 4 a 8 dígitos)</span>
          <input name="password" inputMode="numeric" pattern="\\d{4,8}" className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Tipo</span>
            <select name="role" defaultValue={String(user.role)} className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="ADMIN">Administrador</option>
              <option value="MUSICIAN">Músico</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Status</span>
            <select name="active" defaultValue={user.active ? 'true' : 'false'} className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="true">Ativo</option>
              <option value="false">Desativado</option>
            </select>
          </label>
        </div>

        <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Salvar</button>
      </form>
    </div>
  )
}

