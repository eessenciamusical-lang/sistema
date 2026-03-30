import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { formatDateBR, formatDateTimeBR } from '@/lib/format'
import { redirect } from 'next/navigation'

export default async function MusicianAgendaPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-2 text-sm text-zinc-300">Seu perfil de músico ainda não foi configurado.</p>
      </div>
    )
  }

  const now = new Date()
  const assignments = await prisma.assignment.findMany({
    where: { musicianId: profile.id },
    include: { event: true },
    orderBy: { event: { date: 'asc' } },
  })

  const upcoming = assignments.filter((a) => a.event.date >= now)
  const recent = assignments.filter((a) => a.event.date < now).slice(0, 3)

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-zinc-300">Confirmações e próximos eventos.</p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Próximos</h2>
        <div className="mt-4 grid gap-3">
          {upcoming.length === 0 ? (
            <div className="text-sm text-zinc-300">Nenhum evento confirmado.</div>
          ) : (
            upcoming.map((a) => (
              <a
                key={a.id}
                href={`/m/eventos/${a.eventId}`}
                className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
              >
                <div className="font-medium">{a.event.title}</div>
                <div className="mt-1 text-sm text-zinc-300">{formatDateTimeBR(a.event.date)}</div>
                <div className="mt-1 text-sm text-zinc-400">{a.roleName || '—'}</div>
              </a>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Últimos</h2>
        <div className="mt-4 grid gap-3">
          {recent.length === 0 ? (
            <div className="text-sm text-zinc-300">Sem histórico recente.</div>
          ) : (
            recent.map((a) => (
              <a
                key={a.id}
                href={`/m/eventos/${a.eventId}`}
                className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
              >
                <div className="font-medium">{a.event.title}</div>
                <div className="mt-1 text-sm text-zinc-300">{formatDateBR(a.event.date)}</div>
              </a>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

