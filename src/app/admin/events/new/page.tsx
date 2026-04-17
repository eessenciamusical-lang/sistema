import { supabaseAdmin } from '@/lib/db'
import { parseDateTimeBR } from '@/lib/format'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export default async function NewEventPage() {
  async function createAction(formData: FormData) {
    'use server'

    const parsed = z
      .object({
        title: z.string().min(2),
        date: z.string().min(8),
        locationName: z.string().optional().or(z.literal('')),
        address: z.string().optional().or(z.literal('')),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        mapUrl: z.string().url().optional().or(z.literal('')),
        clientName: z.string().optional().or(z.literal('')),
        clientEmail: z.string().email().optional().or(z.literal('')),
        clientPhone: z.string().optional().or(z.literal('')),
      })
      .safeParse({
        title: String(formData.get('title') ?? '').trim(),
        date: String(formData.get('date') ?? '').trim(),
        locationName: String(formData.get('locationName') ?? '').trim(),
        address: String(formData.get('address') ?? '').trim(),
        city: String(formData.get('city') ?? '').trim(),
        state: String(formData.get('state') ?? '').trim(),
        mapUrl: String(formData.get('mapUrl') ?? '').trim(),
        clientName: String(formData.get('clientName') ?? '').trim(),
        clientEmail: String(formData.get('clientEmail') ?? '').trim(),
        clientPhone: String(formData.get('clientPhone') ?? '').trim(),
      })

    if (!parsed.success) redirect('/admin/events/new')

    let clientId: string | null = null
    if (parsed.data.clientName) {
      const { data: client } = await supabaseAdmin
        .from('Client')
        .insert({
          name: parsed.data.clientName,
          email: parsed.data.clientEmail || null,
          phone: parsed.data.clientPhone || null,
        })
        .select('id')
        .single()
      clientId = client?.id ?? null
    }

    const when = parseDateTimeBR(parsed.data.date)
    if (!when) redirect('/admin/events/new')

    const { data: event } = await supabaseAdmin
      .from('Event')
      .insert({
        title: parsed.data.title,
        date: when.toISOString(),
        eventType: 'WEDDING',
        locationName: parsed.data.locationName || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        mapUrl: parsed.data.mapUrl || null,
        clientId,
      })
      .select('id')
      .single()
    if (!event) redirect('/admin/events/new')

    await supabaseAdmin.from('Contract').insert({ eventId: event.id, totalAmount: 0, terms: '', status: 'DRAFT' })

    redirect(`/admin/events/${event.id}`)
  }

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo evento</h1>
        <p className="mt-1 text-sm text-zinc-300">Cadastre o casamento e depois faça a escala dos músicos.</p>
      </div>

      <form action={createAction} className="mt-8 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Título</span>
          <input
            name="title"
            required
            className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            placeholder="Casamento de Ana e João"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Data e hora (dd/mm/aaaa hh:mm)</span>
          <input
            name="date"
            placeholder="24/12/2026 19:30"
            required
            className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Local (nome)</span>
            <input
              name="locationName"
              className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="Espaço do Evento"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">URL do mapa (opcional)</span>
            <input
              name="mapUrl"
              className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="https://www.google.com/maps/..."
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Endereço</span>
          <input
            name="address"
            className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            placeholder="Rua, número, bairro"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Cidade</span>
            <input
              name="city"
              className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">UF</span>
            <input
              name="state"
              className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
            />
          </label>
        </div>

        <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-medium">Cliente (opcional)</div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Nome</span>
              <input
                name="clientName"
                className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                placeholder="Nome dos noivos"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Email</span>
                <input
                  name="clientEmail"
                  type="email"
                  className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Telefone</span>
                <input
                  name="clientPhone"
                  className="h-11 rounded-xl bg-white/5 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
        >
          Criar evento
        </button>
      </form>
    </div>
  )
}
