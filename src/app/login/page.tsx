import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { z } from 'zod'
import { AuthError } from 'next-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default async function LoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {}
  const error = typeof sp.error === 'string' ? sp.error : null

  async function loginAction(formData: FormData) {
    'use server'
    const parsed = z
      .object({
        identifier: z.string().min(1),
        password: z.string().regex(/^\d{4,8}$/),
      })
      .safeParse({
        identifier: String(formData.get('identifier') ?? '').trim(),
        password: String(formData.get('password') ?? '').trim(),
      })

    if (!parsed.success) redirect('/login?error=invalid')

    try {
      await signIn('credentials', {
        identifier: parsed.data.identifier,
        password: parsed.data.password,
        redirectTo: '/admin',
      })
    } catch (e) {
      if (e instanceof AuthError) {
        redirect('/login?error=auth')
      }
      throw e
    }
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Image src="/essencia-logo.svg" alt="Essência Musical" width={180} height={36} className="h-9 w-auto" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Acesso</h1>
        <p className="mt-2 text-sm text-zinc-300">Entre com seu login (ou email) e sua senha numérica.</p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
            {error === 'invalid'
              ? 'Preencha login/email e uma senha numérica de 4 a 8 dígitos.'
              : error === 'auth'
                ? 'Login ou senha inválidos.'
                : 'Não foi possível entrar.'}
          </div>
        ) : null}

        <form action={loginAction} className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Login ou Email</span>
            <input
              name="identifier"
              required
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="master"
              autoComplete="username"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Senha (4 a 8 dígitos)</span>
            <input
              name="password"
              required
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="12345678"
              autoComplete="current-password"
            />
          </label>

          <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">Entrar</button>
        </form>
      </main>
    </div>
  )
}
