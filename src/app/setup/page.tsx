import { hasSupabaseEnv, hasSupabaseServiceRole, supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function SetupPage() {
  const envOk = hasSupabaseEnv() && hasSupabaseServiceRole()

  const { data: anyUser, error: anyUserErr } = envOk ? await supabaseAdmin.from('User').select('id').limit(1) : { data: null, error: null }
  const hasAnyUser = Array.isArray(anyUser) ? anyUser.length > 0 : Boolean(anyUser)
  if (hasAnyUser) redirect('/login')

  async function createFirstAdminAction(formData: FormData) {
    'use server'
    if (!hasSupabaseEnv() || !hasSupabaseServiceRole()) redirect('/setup?error=env')

    const { data: anyUser } = await supabaseAdmin.from('User').select('id').limit(1)
    if (Array.isArray(anyUser) && anyUser.length > 0) redirect('/login')

    const parsed = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        login: z.string().optional().or(z.literal('')),
        password: z.string().regex(/^\d{4,8}$/),
      })
      .safeParse({
        name: String(formData.get('name') ?? '').trim(),
        email: String(formData.get('email') ?? '').trim().toLowerCase(),
        login: String(formData.get('login') ?? '').trim().toLowerCase(),
        password: String(formData.get('password') ?? '').trim(),
      })
    if (!parsed.success) redirect('/setup?error=invalid')

    const login = parsed.data.login || null

    const { data: emailOwner } = await supabaseAdmin.from('User').select('id').eq('email', parsed.data.email).maybeSingle()
    if (emailOwner) redirect('/setup?error=email')

    if (login) {
      const { data: loginOwner } = await supabaseAdmin.from('User').select('id').eq('login', login).maybeSingle()
      if (loginOwner) redirect('/setup?error=login')
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    const { error } = await supabaseAdmin.from('User').insert({
      name: parsed.data.name,
      email: parsed.data.email,
      login,
      role: 'ADMIN',
      passwordHash,
      active: true,
    })
    if (error) redirect('/setup?error=create')

    redirect('/login')
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50">
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Primeiro acesso</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Cadastre o primeiro administrador. Depois disso, o sistema passa a exigir login e senha.
        </p>

        {!envOk ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
            Configure as variáveis do Supabase (URL, anon key e service role) na Vercel antes de continuar.
          </div>
        ) : anyUserErr ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            Não foi possível acessar a tabela de usuários. Verifique se o schema foi aplicado no Supabase.
          </div>
        ) : null}

        <form action={createFirstAdminAction} className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Nome</span>
            <input name="name" required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Email</span>
            <input name="email" type="email" required className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Login (opcional)</span>
            <input name="login" className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Senha (4 a 8 dígitos)</span>
            <input
              name="password"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              required
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 ring-1 ring-white/10"
            />
          </label>
          <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Criar admin</button>
        </form>

        <div className="mt-6 text-sm text-zinc-300">
          <Link className="text-amber-200/90 hover:text-amber-200" href="/login">
            Ir para login
          </Link>
        </div>
      </main>
    </div>
  )
}

