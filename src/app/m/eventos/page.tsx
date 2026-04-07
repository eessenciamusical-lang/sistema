import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { formatDateBR } from '@/lib/format'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function MusicianEventosPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const profile = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) redirect('/m/agenda')

  const assignments = await prisma.assignment.findMany({
    where: { musicianId: profile.id },
    include: { event: true },
    orderBy: { event: { date: 'asc' } },
  })

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
        <p className="mt-1 text-sm text-zinc-300">Detalhes, mapa e repertório.</p>
      </div>

      <div className="grid gap-3">
        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            Nenhum evento na sua agenda.
          </div>
        ) : (
          assignments.map((a) => (
            <a
              key={a.id}
              href={`/m/eventos/${a.eventId}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{a.event.title}</div>
                  <div className="mt-1 text-sm text-zinc-300">{formatDateBR(a.event.date)}</div>
                  <div className="mt-1 text-sm text-zinc-400">{a.roleName || '—'}</div>
                </div>
                <div className="text-xs text-zinc-300">{a.status}</div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  )
}
