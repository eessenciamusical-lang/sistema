import { prisma } from '@/lib/db'
import { formatDateBR } from '@/lib/format'
import Link from 'next/link'

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: 'asc' },
    include: { client: true, assignments: true },
  })

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escala / Agenda</h1>
          <p className="mt-1 text-sm text-zinc-300">Eventos e músicos escalados.</p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
        >
          Novo evento
        </Link>
      </div>

      <div className="grid gap-3">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            Nenhum evento cadastrado.
          </div>
        ) : (
          events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold">{e.title}</div>
                  <div className="text-sm text-zinc-300">
                    {formatDateBR(e.date)}
                    {e.client?.name ? ` · ${e.client.name}` : ''}
                  </div>
                </div>
                <div className="text-sm text-zinc-200">{e.assignments.length} músico(s)</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
