import { signIn } from '@/auth'
import { hasSupabaseEnv, hasSupabaseServiceRole, supabaseAdmin } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {}
  const error = typeof sp.error === 'string' ? sp.error : ''

  const envOk = hasSupabaseEnv() && hasSupabaseServiceRole()
  const { data: anyUser, error: anyUserErr } = envOk ? await supabaseAdmin.from('User').select('id').limit(1) : { data: null, error: null }
  const hasAnyUser = Array.isArray(anyUser) ? anyUser.length > 0 : Boolean(anyUser)

  async function loginAction(formData: FormData) {
    'use server'
    const identifier = String(formData.get('identifier') ?? '').trim()
    const password = String(formData.get('password') ?? '').trim()
    await signIn('credentials', { identifier, password, redirectTo: '/admin' }).catch(() => {
      redirect('/login?error=1')
    })
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50">
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Acesso</h1>
        <p className="mt-1 text-sm text-zinc-300">Entre com email/login e senha numérica (4 a 8 dígitos).</p>

        {!hasAnyUser ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
            Nenhum usuário cadastrado ainda. Faça o primeiro cadastro em{' '}
            <Link className="text-amber-200 underline hover:text-amber-200" href="/setup">
              /setup
            </Link>
            .
          </div>
        ) : null}
        {anyUserErr ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            Não foi possível acessar a tabela de usuários. Verifique se o schema foi aplicado no Supabase.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            Não foi possível entrar. Verifique as credenciais e se a conta está ativa.
          </div>
        ) : null}

        <form action={loginAction} className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Email ou login</span>
            <input
              name="identifier"
              required
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Senha (4 a 8 dígitos)</span>
            <input
              name="password"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              required
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            />
          </label>
          <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Entrar</button>
        </form>
      </main>
    </div>
  )
}
