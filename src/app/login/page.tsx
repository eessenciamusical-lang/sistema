import { signIn } from '@/auth'
import { redirect } from 'next/navigation'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {}
  const error = typeof sp.error === 'string' ? sp.error : ''

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
