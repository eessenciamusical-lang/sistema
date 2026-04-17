import { auth } from '@/auth'
import { hasSupabaseEnv, hasSupabaseServiceRole, supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type DbUserRow = {
  id: string
  name: string | null
  email: string | null
  login: string | null
  role: string | null
  active?: boolean | null
  createdAt?: string | null
}

function asDbUserRow(value: unknown): DbUserRow | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  return {
    id: r.id,
    name: typeof r.name === 'string' ? r.name : r.name == null ? null : String(r.name),
    email: typeof r.email === 'string' ? r.email : r.email == null ? null : String(r.email),
    login: typeof r.login === 'string' ? r.login : r.login == null ? null : String(r.login),
    role: typeof r.role === 'string' ? r.role : r.role == null ? null : String(r.role),
    active: typeof r.active === 'boolean' ? r.active : r.active == null ? null : Boolean(r.active),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt == null ? null : String(r.createdAt),
  }
}

function normalizeEmail(value: string) {
  const v = value.trim().toLowerCase()
  return v
}

function safeBool(value: string) {
  return value === 'true'
}

function shouldLogAudit() {
  return hasSupabaseEnv() && hasSupabaseServiceRole()
}

async function auditLog({
  actorUserId,
  action,
  targetUserId,
  meta,
}: {
  actorUserId: string
  action: string
  targetUserId: string | null
  meta: Record<string, unknown>
}) {
  if (!shouldLogAudit()) return
  try {
    await supabaseAdmin.from('AuditLog').insert({
      id: crypto.randomUUID(),
      actorUserId,
      targetUserId,
      action,
      meta,
      createdAt: new Date().toISOString(),
    })
  } catch {}
}

export default async function AdminUsuariosPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/m/agenda')

  const sp = (await searchParams) ?? {}
  const roleFilter = typeof sp.role === 'string' ? sp.role : ''
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''

  const dbOk = hasSupabaseEnv() && hasSupabaseServiceRole()
  const { data: rows } = dbOk ? await supabaseAdmin.from('User').select('*').order('createdAt', { ascending: false }) : { data: [] as unknown[] }

  const users = (rows ?? [])
    .map(asDbUserRow)
    .filter((u): u is DbUserRow => Boolean(u))
    .map((u) => ({
      id: u.id,
      name: u.name ?? '',
      email: u.email,
      login: u.login,
      role: u.role === 'MUSICIAN' ? 'MUSICIAN' : 'ADMIN',
      active: u.active === false ? false : true,
      createdAt: u.createdAt ? new Date(u.createdAt) : null,
    }))
    .filter((u) => {
      if (roleFilter === 'ADMIN' || roleFilter === 'MUSICIAN') {
        if (u.role !== roleFilter) return false
      }
      if (q) {
        const hay = `${u.name} ${u.email ?? ''} ${u.login ?? ''}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })

  async function createAction(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')
    if (!hasSupabaseEnv() || !hasSupabaseServiceRole()) redirect('/admin/usuarios')

    const parsed = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        login: z.string().optional().or(z.literal('')),
        password: z.string().regex(/^\d{4,8}$/),
        role: z.enum(['ADMIN', 'MUSICIAN']),
      })
      .safeParse({
        name: String(formData.get('name') ?? '').trim(),
        email: normalizeEmail(String(formData.get('email') ?? '')),
        login: String(formData.get('login') ?? '').trim().toLowerCase(),
        password: String(formData.get('password') ?? '').trim(),
        role: String(formData.get('role') ?? 'ADMIN'),
      })

    if (!parsed.success) redirect('/admin/usuarios?error=create_invalid')

    const { data: exists } = await supabaseAdmin.from('User').select('id').eq('email', parsed.data.email).maybeSingle()
    if (exists) redirect('/admin/usuarios?error=email_exists')

    const login = parsed.data.login ? parsed.data.login.trim().toLowerCase() : ''
    if (login) {
      const { data: loginExists } = await supabaseAdmin.from('User').select('id').eq('login', login).maybeSingle()
      if (loginExists) redirect('/admin/usuarios?error=login_exists')
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    const { data: created, error } = await supabaseAdmin
      .from('User')
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        login: login || null,
        role: parsed.data.role,
        passwordHash,
        active: true,
      })
      .select('id')
      .single()

    if (error || !created) redirect('/admin/usuarios?error=create_failed')

    if (parsed.data.role === 'MUSICIAN') {
      await supabaseAdmin.from('MusicianProfile').insert({ userId: created.id, baseCacheCents: 0, active: true })
    }

    await auditLog({
      actorUserId: session.user.id,
      action: 'USER_CREATE',
      targetUserId: String(created.id),
      meta: { role: parsed.data.role, email: parsed.data.email, login: login || null },
    })

    revalidatePath('/admin/usuarios')
    redirect('/admin/usuarios?ok=created')
  }

  async function updateAction(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')
    if (!hasSupabaseEnv() || !hasSupabaseServiceRole()) redirect('/admin/usuarios')

    const parsed = z
      .object({
        id: z.string().min(1),
        name: z.string().min(2),
        email: z.string().email(),
        login: z.string().optional().or(z.literal('')),
        role: z.enum(['ADMIN', 'MUSICIAN']),
        active: z.enum(['true', 'false']),
        password: z.string().optional().or(z.literal('')),
      })
      .safeParse({
        id: String(formData.get('id') ?? '').trim(),
        name: String(formData.get('name') ?? '').trim(),
        email: normalizeEmail(String(formData.get('email') ?? '')),
        login: String(formData.get('login') ?? '').trim().toLowerCase(),
        role: String(formData.get('role') ?? 'ADMIN'),
        active: String(formData.get('active') ?? 'true'),
        password: String(formData.get('password') ?? '').trim(),
      })

    if (!parsed.success) redirect('/admin/usuarios?error=update_invalid')

    const { data: current } = await supabaseAdmin.from('User').select('*').eq('id', parsed.data.id).maybeSingle()
    if (!current) redirect('/admin/usuarios?error=not_found')

    const { data: emailOwner } = await supabaseAdmin.from('User').select('id').eq('email', parsed.data.email).maybeSingle()
    const emailOwnerId = emailOwner && typeof (emailOwner as Record<string, unknown>).id === 'string' ? String((emailOwner as Record<string, unknown>).id) : null
    if (emailOwnerId && emailOwnerId !== parsed.data.id) redirect('/admin/usuarios?error=email_exists')

    const patch: Record<string, unknown> = {
      name: parsed.data.name,
      email: parsed.data.email,
      login: parsed.data.login ? parsed.data.login.trim().toLowerCase() : null,
      role: parsed.data.role,
      active: safeBool(parsed.data.active),
    }

    if (parsed.data.login) {
      const login = parsed.data.login.trim().toLowerCase()
      const { data: loginOwner } = await supabaseAdmin.from('User').select('id').eq('login', login).maybeSingle()
      const loginOwnerId = loginOwner && typeof (loginOwner as Record<string, unknown>).id === 'string' ? String((loginOwner as Record<string, unknown>).id) : null
      if (loginOwnerId && loginOwnerId !== parsed.data.id) redirect('/admin/usuarios?error=login_exists')
    }

    if (parsed.data.password) {
      if (!/^\d{4,8}$/.test(parsed.data.password)) redirect('/admin/usuarios?error=password_invalid')
      patch.passwordHash = await bcrypt.hash(parsed.data.password, 10)
    }

    const { error } = await supabaseAdmin.from('User').update(patch).eq('id', parsed.data.id)
    if (error) redirect('/admin/usuarios?error=update_failed')

    if (parsed.data.role === 'MUSICIAN') {
      const { data: profile } = await supabaseAdmin.from('MusicianProfile').select('id').eq('userId', parsed.data.id).maybeSingle()
      if (!profile) await supabaseAdmin.from('MusicianProfile').insert({ userId: parsed.data.id, baseCacheCents: 0, active: true })
    }

    await auditLog({
      actorUserId: session.user.id,
      action: 'USER_UPDATE',
      targetUserId: parsed.data.id,
      meta: {
        before: {
          role: typeof (current as Record<string, unknown>).role === 'string' ? String((current as Record<string, unknown>).role) : null,
          email: typeof (current as Record<string, unknown>).email === 'string' ? String((current as Record<string, unknown>).email) : null,
          active: typeof (current as Record<string, unknown>).active === 'boolean' ? Boolean((current as Record<string, unknown>).active) : null,
        },
        after: patch,
      },
    })

    revalidatePath('/admin/usuarios')
    redirect('/admin/usuarios?ok=updated')
  }

  async function deleteAction(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')
    if (!hasSupabaseEnv() || !hasSupabaseServiceRole()) redirect('/admin/usuarios')

    const parsed = z
      .object({
        id: z.string().min(1),
        confirm: z.string().min(1),
      })
      .safeParse({
        id: String(formData.get('id') ?? '').trim(),
        confirm: String(formData.get('confirm') ?? '').trim().toLowerCase(),
      })

    if (!parsed.success) redirect('/admin/usuarios?error=delete_invalid')

    const { data: target } = await supabaseAdmin.from('User').select('*').eq('id', parsed.data.id).maybeSingle()
    if (!target) redirect('/admin/usuarios?error=not_found')
    const targetEmail = (typeof (target as Record<string, unknown>).email === 'string' ? String((target as Record<string, unknown>).email) : '').toLowerCase()
    const targetLogin = (typeof (target as Record<string, unknown>).login === 'string' ? String((target as Record<string, unknown>).login) : '').toLowerCase()
    const targetConfirm = targetEmail || targetLogin
    if (!targetConfirm || parsed.data.confirm !== targetConfirm) redirect('/admin/usuarios?error=delete_confirm')

    await supabaseAdmin.from('TaskReminder').delete().eq('userId', parsed.data.id)
    await supabaseAdmin.from('NotificationAck').delete().eq('userId', parsed.data.id)

    const { data: musicianProfile } = await supabaseAdmin.from('MusicianProfile').select('id').eq('userId', parsed.data.id).maybeSingle()
    if (musicianProfile?.id) {
      await supabaseAdmin.from('MusicianProfileLink').delete().eq('musicianId', musicianProfile.id)
      await supabaseAdmin.from('Assignment').delete().eq('musicianId', musicianProfile.id)
      await supabaseAdmin.from('MusicianProfile').delete().eq('id', musicianProfile.id)
    }

    await supabaseAdmin.from('User').delete().eq('id', parsed.data.id)

    await auditLog({
      actorUserId: session.user.id,
      action: 'USER_DELETE',
      targetUserId: parsed.data.id,
      meta: {
        email: typeof (target as Record<string, unknown>).email === 'string' ? String((target as Record<string, unknown>).email) : null,
        login: typeof (target as Record<string, unknown>).login === 'string' ? String((target as Record<string, unknown>).login) : null,
        role: typeof (target as Record<string, unknown>).role === 'string' ? String((target as Record<string, unknown>).role) : null,
      },
    })

    revalidatePath('/admin/usuarios')
    redirect('/admin/usuarios?ok=deleted')
  }

  const status = typeof sp.ok === 'string' ? sp.ok : ''
  const error = typeof sp.error === 'string' ? sp.error : ''

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="mt-1 text-sm text-zinc-300">Admins e músicos com senha numérica (4 a 8 dígitos).</p>
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">Operação concluída.</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">Não foi possível concluir a operação.</div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Criar usuário</h2>
        <form action={createAction} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Nome</span>
              <input name="name" required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Email</span>
              <input name="email" type="email" required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm text-zinc-200">Login (opcional)</span>
              <input name="login" className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Senha (4–8 dígitos)</span>
              <input
                name="password"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4,8}"
                required
                className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Tipo</span>
              <select name="role" defaultValue="ADMIN" className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10">
                <option value="ADMIN">Admin</option>
                <option value="MUSICIAN">Músico</option>
              </select>
            </label>
            <div className="flex items-end">
              <button className="h-11 w-full rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Criar</button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Lista</h2>
          <form className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar"
              className="h-11 rounded-xl bg-black/40 px-4 text-sm text-zinc-50 ring-1 ring-white/10"
            />
            <select name="role" defaultValue={roleFilter} className="h-11 rounded-xl bg-black/40 px-4 text-sm text-zinc-50 ring-1 ring-white/10">
              <option value="">Todos</option>
              <option value="ADMIN">Admin</option>
              <option value="MUSICIAN">Músico</option>
            </select>
            <button className="h-11 rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10">Filtrar</button>
          </form>
        </div>

        {!dbOk ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
            Configure as variáveis do Supabase (incluindo service role) para gerenciar usuários.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {users.length === 0 ? (
            <div className="text-sm text-zinc-300">Nenhum usuário.</div>
          ) : (
            users.map((u) => (
              <details key={u.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {(u.email ?? u.login ?? '—') + (u.login && u.email ? ` · ${u.login}` : '')} · {u.role} · {u.active ? 'Ativo' : 'Desativado'}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400">{u.createdAt ? u.createdAt.toISOString().slice(0, 10) : ''}</div>
                  </div>
                </summary>

                <div className="mt-4 grid gap-4">
                  <form action={updateAction} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <input type="hidden" name="id" value={u.id} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm text-zinc-200">Nome</span>
                        <input name="name" defaultValue={u.name} required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-zinc-200">Email</span>
                        <input
                          name="email"
                          type="email"
                          defaultValue={u.email ?? ''}
                          required
                          className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <label className="grid gap-2 sm:col-span-2">
                        <span className="text-sm text-zinc-200">Login (opcional)</span>
                        <input
                          name="login"
                          defaultValue={u.login ?? ''}
                          className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-zinc-200">Tipo</span>
                        <select name="role" defaultValue={u.role} className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10">
                          <option value="ADMIN">Admin</option>
                          <option value="MUSICIAN">Músico</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-zinc-200">Status</span>
                        <select
                          name="active"
                          defaultValue={String(u.active)}
                          className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Desativado</option>
                        </select>
                      </label>
                      <label className="grid gap-2 sm:col-span-2">
                        <span className="text-sm text-zinc-200">Nova senha (opcional)</span>
                        <input
                          name="password"
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]{4,8}"
                          className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
                        />
                      </label>
                    </div>
                    <button className="h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Salvar</button>
                  </form>

                  <form action={deleteAction} className="grid gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                    <input type="hidden" name="id" value={u.id} />
                    <div className="text-sm text-red-100">
                      Para remover, digite o identificador do usuário ({u.email ?? u.login ?? '—'}) e confirme.
                    </div>
                    <input
                      name="confirm"
                      placeholder="Digite o identificador para confirmar"
                      className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-red-400/30"
                    />
                    <button className="h-11 rounded-xl bg-red-500 px-5 font-medium text-white hover:bg-red-400">Remover usuário</button>
                  </form>
                </div>
              </details>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
