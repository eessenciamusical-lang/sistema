import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/m/agenda')

  async function logoutAction() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <Image src="/essencia-logo.svg" alt="Essência Musical" width={160} height={32} className="h-8 w-auto" />
            </Link>
            <nav className="hidden items-center gap-2 text-sm sm:flex">
              <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/admin">
                Painel
              </Link>
              <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/admin/events">
                Escala
              </Link>
              <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/admin/musicos">
                Músicos
              </Link>
              <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/admin/financeiro">
                Financeiro
              </Link>
              <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/admin/dre">
                DRE
              </Link>
              <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/admin/contracts">
                Contratos
              </Link>
              <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/admin/restaurantes">
                Restaurantes
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-zinc-300 sm:block">{session.user.email}</div>
            <form action={logoutAction}>
              <button className="h-10 rounded-xl bg-white/5 px-4 text-sm font-medium text-zinc-50 hover:bg-white/10">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
