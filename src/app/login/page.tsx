import { auth, signIn } from '@/auth'
import { redirect } from 'next/navigation'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.role === 'ADMIN') redirect('/admin')
  if (session?.user?.role === 'MUSICIAN') redirect('/m/agenda')

  const sp = (await searchParams) ?? {}
  const next = typeof sp.next === 'string' ? sp.next : undefined
  const errorParam = typeof sp.error === 'string' ? sp.error : undefined
  const error = errorParam === 'CredentialsSignin' ? 'Credenciais inválidas' : undefined

  async function loginAction(formData: FormData) {
    'use server'

    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')

    await signIn('credentials', {
      email,
      password,
      redirectTo: next || '/admin',
    })
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow">
        <div className="flex flex-col gap-2">
          <div className="text-xs tracking-[0.2em] text-amber-200/80">ESSÊNCIA MUSICAL</div>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-zinc-300">Acesse o painel administrativo ou o portal do músico.</p>
        </div>

        <form action={loginAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-200">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="voce@exemplo.com"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-200">Senha</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            className="h-11 rounded-xl bg-amber-300 text-zinc-950 font-medium hover:bg-amber-200 active:bg-amber-300/90"
          >
            Entrar
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-black/30 p-4 text-sm text-zinc-200">
          <div className="font-medium text-zinc-50">Acesso inicial</div>
          <div className="mt-1 text-zinc-300">
            Admin: <span className="text-zinc-50">admin@essenciamusical.com</span> /{' '}
            <span className="text-zinc-50">admin123</span>
          </div>
          <div className="text-zinc-300">
            Músico: <span className="text-zinc-50">musico@essenciamusical.com</span> /{' '}
            <span className="text-zinc-50">musico123</span>
          </div>
        </div>
      </div>
    </div>
  )
}
