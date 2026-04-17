import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminUsuariosPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/login')

  const sp = (await searchParams) ?? {}
  const role = typeof sp.role === 'string' ? sp.role : 'all'
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''

  let query = supabaseAdmin.from('User').select('id,name,email,login,role,active,createdAt').order('createdAt', { ascending: false })
  if (role === 'ADMIN' || role === 'MUSICIAN') query = query.eq('role', role)
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,login.ilike.%${q}%`)
  const { data: users, error } = await query

  async function toggleActiveAction(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

    const parsed = z.object({ id: z.string().min(1), active: z.enum(['true', 'false']) }).safeParse({
      id: String(formData.get('id') ?? ''),
      active: String(formData.get('active') ?? ''),
    })
    if (!parsed.success) redirect('/admin/usuarios')

    await supabaseAdmin.from('User').update({ active: parsed.data.active === 'true' }).eq('id', parsed.data.id)
    await auditLog({
      actorUserId: session.user.id,
      action: 'user.toggle_active',
      targetUserId: parsed.data.id,
      targetType: 'User',
      metadata: { active: parsed.data.active === 'true' },
    })
    redirect('/admin/usuarios')
  }

  async function deleteUserAction(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

    const parsed = z.object({ id: z.string().min(1), confirm: z.string().min(1) }).safeParse({
      id: String(formData.get('id') ?? ''),
      confirm: String(formData.get('confirm') ?? ''),
    })
    if (!parsed.success) redirect('/admin/usuarios')
    if (parsed.data.id === session.user.id) redirect('/admin/usuarios')

    const { data: u } = await supabaseAdmin.from('User').select('email,login').eq('id', parsed.data.id).maybeSingle()
    const expected = (u?.login || u?.email || '').toLowerCase()
    if (!expected || parsed.data.confirm.trim().toLowerCase() !== expected) redirect('/admin/usuarios')

    await supabaseAdmin.from('NotificationAck').delete().eq('userId', parsed.data.id)
    await supabaseAdmin.from('TaskReminder').delete().eq('userId', parsed.data.id)
    await supabaseAdmin.from('MusicianProfile').delete().eq('userId', parsed.data.id)
    await supabaseAdmin.from('User').delete().eq('id', parsed.data.id)

    await auditLog({
      actorUserId: session.user.id,
      action: 'user.delete',
      targetUserId: parsed.data.id,
      targetType: 'User',
      metadata: { confirmedBy: expected },
    })
    redirect('/admin/usuarios')
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="mt-1 text-sm text-zinc-300">Administre contas de administradores e músicos.</p>
        </div>
        <Link href="/admin/usuarios/new" className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">
          Novo usuário
        </Link>
      </div>

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Busca</span>
          <input
            name="q"
            defaultValue={q}
            className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            placeholder="Nome, email ou login"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Tipo</span>
          <select
            name="role"
            defaultValue={role}
            className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
          >
            <option value="all">Todos</option>
            <option value="ADMIN">Administradores</option>
            <option value="MUSICIAN">Músicos</option>
          </select>
        </label>
        <button className="h-11 rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10">Filtrar</button>
      </form>

      <div className="grid gap-3">
        {error ? <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">Não foi possível carregar usuários.</div> : null}
        {(users ?? []).length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">Nenhum usuário encontrado.</div>
        ) : (
          (users ?? []).map((u) => (
            <div key={String(u.id)} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold">{String(u.name)}</div>
                  <div className="mt-1 text-sm text-zinc-300">
                    {(u.login ? `@${String(u.login)}` : '') + (u.email ? ` · ${String(u.email)}` : '')}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {String(u.role)} · {u.active ? 'Ativo' : 'Desativado'}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link href={`/admin/usuarios/${String(u.id)}/edit`} className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm hover:bg-white/10">
                    Editar
                  </Link>
                  <form action={toggleActiveAction}>
                    <input type="hidden" name="id" value={String(u.id)} />
                    <input type="hidden" name="active" value={(!u.active).toString()} />
                    <button className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm hover:bg-white/10">
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </form>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-red-200/90">Excluir usuário</summary>
                <form action={deleteUserAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={String(u.id)} />
                  <label className="grid gap-2">
                    <span className="text-xs text-zinc-300">Digite {String(u.login || u.email || '')} para confirmar</span>
                    <input name="confirm" className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
                  </label>
                  <button className="h-11 rounded-xl bg-red-400 px-5 font-medium text-zinc-950 hover:bg-red-300">Excluir</button>
                </form>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

