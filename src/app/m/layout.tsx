import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MusicianLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'MUSICIAN') redirect('/admin')

  async function logoutAction() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50 pb-20">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/m/agenda" className="flex items-center gap-3">
            <img src="/essencia-logo.svg" alt="Essência Musical" className="h-8 w-auto" />
          </Link>
          <form action={logoutAction}>
            <button className="h-10 rounded-xl bg-white/5 px-4 text-sm font-medium text-zinc-50 hover:bg-white/10">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-2 px-4 py-3 text-sm">
          <Link className="rounded-xl bg-white/5 px-3 py-3 text-center hover:bg-white/10" href="/m/agenda">
            Agenda
          </Link>
          <Link className="rounded-xl bg-white/5 px-3 py-3 text-center hover:bg-white/10" href="/m/eventos">
            Eventos
          </Link>
          <Link className="rounded-xl bg-white/5 px-3 py-3 text-center hover:bg-white/10" href="/m/financeiro">
            Financeiro
          </Link>
        </div>
      </nav>
    </div>
  )
}
