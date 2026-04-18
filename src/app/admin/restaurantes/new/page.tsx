import { supabaseAdmin } from '@/lib/db'
import { parseDateBR } from '@/lib/format'
import { newId } from '@/lib/ids'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { enumerateDaysInclusive, parseTimeHHMM, toISODateKey } from '@/lib/restaurants'
import { MoneyInput } from '@/components/money-input'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function parseBRLToCents(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

function distributeCents(total: number, parts: number) {
  if (parts <= 0) return []
  const base = Math.floor(total / parts)
  const rest = total - base * parts
  return Array.from({ length: parts }, (_, i) => base + (i < rest ? 1 : 0))
}

export const dynamic = 'force-dynamic'

export default async function NewRestaurantContractPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const restaurantName = typeof sp.name === 'string' ? sp.name : ''
  const address = typeof sp.address === 'string' ? sp.address : ''
  const city = typeof sp.city === 'string' ? sp.city : ''
  const state = typeof sp.state === 'string' ? sp.state : ''
  const start = typeof sp.start === 'string' ? sp.start : ''
  const end = typeof sp.end === 'string' ? sp.end : ''
  const time = typeof sp.time === 'string' ? sp.time : '20:00'
  const freq = typeof sp.freq === 'string' ? sp.freq : 'MONTHLY'
  const receivable = typeof sp.receivable === 'string' ? sp.receivable : ''
  const error = typeof sp.error === 'string' ? sp.error : ''

  const startDate = start ? parseDateBR(start) : null
  const endDate = end ? parseDateBR(end) : null
  const timeParsed = parseTimeHHMM(time)
  const days = startDate && endDate && timeParsed ? enumerateDaysInclusive(startDate, endDate) : []

  const { data: musicianProfiles } = await supabaseAdmin
    .from('MusicianProfile')
    .select('id,userId,baseCacheCents,instrument,active')
    .eq('active', true)
    .order('id', { ascending: true })
  const userIds = Array.from(new Set((musicianProfiles ?? []).map((m) => String(m.userId)).filter(Boolean)))
  const { data: users } =
    userIds.length === 0
      ? { data: [] as Array<{ id: string; name: string; login: string | null }> }
      : await supabaseAdmin.from('User').select('id,name,login').in('id', userIds)
  const userById = new Map((users ?? []).map((u) => [String(u.id), u]))
  const musicians = (musicianProfiles ?? [])
    .map((m) => ({
      id: String(m.id),
      userId: String(m.userId),
      baseCacheCents: Number(m.baseCacheCents) || 0,
      instrument: (m.instrument as string | null) ?? null,
      active: Boolean(m.active),
      user: {
        name: userById.get(String(m.userId))?.name ? String(userById.get(String(m.userId))?.name) : 'Músico',
        login: (userById.get(String(m.userId))?.login as string | null) ?? null,
      },
    }))
    .sort((a, b) => a.user.name.localeCompare(b.user.name))

  async function createAction(formData: FormData) {
    'use server'

    const parsed = z
      .object({
        restaurantName: z.string().min(2),
        address: z.string().min(3),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        start: z.string().min(8),
        end: z.string().min(8),
        time: z.string().min(4),
        freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
        receivable: z.string().min(1),
      })
      .safeParse({
        restaurantName: String(formData.get('restaurantName') ?? '').trim(),
        address: String(formData.get('address') ?? '').trim(),
        city: String(formData.get('city') ?? '').trim(),
        state: String(formData.get('state') ?? '').trim(),
        start: String(formData.get('start') ?? '').trim(),
        end: String(formData.get('end') ?? '').trim(),
        time: String(formData.get('time') ?? '').trim(),
        freq: String(formData.get('freq') ?? '').trim(),
        receivable: String(formData.get('receivable') ?? '').trim(),
      })

    if (!parsed.success) redirect('/admin/restaurantes/new?error=invalid')

    const s = parseDateBR(parsed.data.start)
    const e = parseDateBR(parsed.data.end)
    const t = parseTimeHHMM(parsed.data.time)
    if (!s || !e || !t || e.getTime() < s.getTime()) redirect('/admin/restaurantes/new?error=dates')

    const receivableTotalCents = parseBRLToCents(parsed.data.receivable)
    if (!receivableTotalCents || receivableTotalCents <= 0) redirect('/admin/restaurantes/new?error=receivable')

    const dayList = enumerateDaysInclusive(s, e)
    const selectionsByDay = new Map<string, Array<{ musicianId: string; costOverrideCents: number | null }>>()

    for (const d of dayList) {
      const key = toISODateKey(d)
      const selected: Array<{ musicianId: string; costOverrideCents: number | null }> = []
      for (const [k, v] of formData.entries()) {
        const m = String(k).match(new RegExp(`^day\\.${key}\\.([^\\.]+)\\.(selected|cost)$`))
        if (!m) continue
        const musicianId = m[1]
        const field = m[2]
        const existing = selected.find((x) => x.musicianId === musicianId) ?? {
          musicianId,
          costOverrideCents: null as number | null,
        }
        if (field === 'selected') {
          if (!selected.some((x) => x.musicianId === musicianId)) selected.push(existing)
        }
        if (field === 'cost') {
          const cents = String(v).trim() ? parseBRLToCents(String(v)) : null
          existing.costOverrideCents = cents
          if (!selected.some((x) => x.musicianId === musicianId)) selected.push(existing)
        }
      }
      const unique = Array.from(new Map(selected.map((x) => [x.musicianId, x])).values())
      selectionsByDay.set(key, unique.filter((x) => formData.get(`day.${key}.${x.musicianId}.selected`) != null))
    }

    const selectedMusicianIds = Array.from(
      new Set(Array.from(selectionsByDay.values()).flat().map((x) => x.musicianId)),
    )

    let contractId: string
    try {
      const { data: existingRestaurant } = await supabaseAdmin
        .from('Restaurant')
        .select('id,name,address,city,state')
        .eq('name', parsed.data.restaurantName)
        .eq('address', parsed.data.address)
        .maybeSingle()

      const restaurant =
        existingRestaurant ??
        (
          await supabaseAdmin
            .from('Restaurant')
            .insert({
              id: newId(),
              name: parsed.data.restaurantName,
              address: parsed.data.address,
              city: parsed.data.city || null,
              state: parsed.data.state || null,
            })
            .select('id,name,address,city,state')
            .single()
        ).data

      if (!restaurant) throw new Error('RESTAURANT')

      const { data: contract } = await supabaseAdmin
        .from('RestaurantContract')
        .insert({
          id: newId(),
          restaurantId: restaurant.id,
          startDate: s.toISOString(),
          endDate: e.toISOString(),
          time: parsed.data.time,
          paymentFrequency: parsed.data.freq,
          receivableTotalCents,
          status: 'ACTIVE',
        })
        .select('id,paymentFrequency')
        .single()

      if (!contract) throw new Error('CONTRACT')
      contractId = String(contract.id)

      const { data: selectedProfiles } =
        selectedMusicianIds.length === 0
          ? { data: [] as Array<{ id: string; baseCacheCents: number }> }
          : await supabaseAdmin.from('MusicianProfile').select('id,baseCacheCents').in('id', selectedMusicianIds)
      const baseCacheById = new Map((selectedProfiles ?? []).map((m) => [String(m.id), Number(m.baseCacheCents) || 0]))

      const createdEvents: Array<{ id: string; date: Date; dayKey: string; totalCostCents: number }> = []

      for (const d of dayList) {
        const key = toISODateKey(d)
        const when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.hh, t.mm, 0, 0)

        const selected = selectionsByDay.get(key) ?? []
        const selectedIds = selected.map((x) => x.musicianId)

        if (selectedIds.length) {
          const { data: sameTimeEvents } = await supabaseAdmin.from('Event').select('id').eq('date', when.toISOString())
          const sameTimeEventIds = Array.from(new Set((sameTimeEvents ?? []).map((x) => String(x.id))))
          if (sameTimeEventIds.length) {
            const { data: conflict } = await supabaseAdmin
              .from('Assignment')
              .select('id')
              .in('eventId', sameTimeEventIds)
              .in('musicianId', selectedIds)
              .limit(1)
            if ((conflict ?? []).length) throw new Error('CONFLICT')
          }
        }

        const { data: event } = await supabaseAdmin
          .from('Event')
          .insert({
            id: newId(),
            title: `Restaurante: ${restaurant.name}`,
            date: when.toISOString(),
            eventType: 'RESTAURANT',
            locationName: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            state: restaurant.state,
            restaurantContractId: contract.id,
          })
          .select('id')
          .single()

        if (!event) throw new Error('EVENT')

        let dayTotal = 0
        for (const sel of selected) {
          const base = baseCacheById.get(sel.musicianId) ?? 0
          const costCents = sel.costOverrideCents ?? base
          dayTotal += costCents

          const { data: assignment } = await supabaseAdmin
            .from('Assignment')
            .insert({
              id: newId(),
              eventId: event.id,
              musicianId: sel.musicianId,
              status: 'CONFIRMED',
              costCents,
            })
            .select('id')
            .single()

          if (!assignment) throw new Error('ASSIGNMENT')

          await supabaseAdmin.from('Payment').insert({
            id: newId(),
            eventId: event.id,
            restaurantContractId: contract.id,
            type: 'MUSICIAN_PAYABLE',
            direction: 'PAYABLE',
            assignmentId: assignment.id,
            amount: costCents,
            status: 'PENDING',
            dueDate: when.toISOString(),
            note: `Cachê (Restaurante): ${restaurant.name}`,
          })
        }

        createdEvents.push({ id: String(event.id), date: when, dayKey: key, totalCostCents: dayTotal })
      }

      const totalCents = createdEvents.reduce((sum, x) => sum + x.totalCostCents, 0)
      await supabaseAdmin.from('RestaurantContract').update({ totalCents }).eq('id', contract.id)

      const freq = String(contract.paymentFrequency)
      if (freq === 'DAILY') {
        const daily = distributeCents(receivableTotalCents, createdEvents.length)
        for (let i = 0; i < createdEvents.length; i++) {
          const ev = createdEvents[i]
          await supabaseAdmin.from('Payment').insert({
            id: newId(),
            eventId: ev.id,
            restaurantContractId: contract.id,
            type: 'RESTAURANT_RECEIVABLE',
            direction: 'RECEIVABLE',
            amount: daily[i] ?? 0,
            status: 'PENDING',
            dueDate: ev.date.toISOString(),
            note: `Restaurante (${restaurant.name}) - diário`,
          })
        }
      } else if (freq === 'WEEKLY') {
        const daily = distributeCents(receivableTotalCents, createdEvents.length)
        for (let i = 0; i < createdEvents.length; i += 7) {
          const slice = createdEvents.slice(i, i + 7)
          const amount = slice.reduce((sum, _ev, idx) => sum + (daily[i + idx] ?? 0), 0)
          const last = slice[slice.length - 1]
          const first = slice[0]
          await supabaseAdmin.from('Payment').insert({
            id: newId(),
            eventId: last.id,
            restaurantContractId: contract.id,
            type: 'RESTAURANT_RECEIVABLE',
            direction: 'RECEIVABLE',
            amount,
            status: 'PENDING',
            dueDate: last.date.toISOString(),
            note: `Restaurante (${restaurant.name}) - semanal ${first.dayKey} a ${last.dayKey}`,
          })
        }
      } else {
        const last = createdEvents[createdEvents.length - 1]
        const first = createdEvents[0]
        await supabaseAdmin.from('Payment').insert({
          id: newId(),
          eventId: last.id,
          restaurantContractId: contract.id,
          type: 'RESTAURANT_RECEIVABLE',
          direction: 'RECEIVABLE',
          amount: receivableTotalCents,
          status: 'PENDING',
          dueDate: last.date.toISOString(),
          note: `Restaurante (${restaurant.name}) - mensal ${first.dayKey} a ${last.dayKey}`,
        })
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'digest' in e) throw e
      if (String(e).includes('CONFLICT')) redirect('/admin/restaurantes/new?error=conflict')
      throw e
    }

    revalidatePath('/admin/restaurantes')
    revalidatePath('/admin')
    redirect(`/admin/restaurantes/${contractId}`)
  }

  const errorMessage =
    error === 'conflict'
      ? 'Conflito de agenda: um ou mais músicos já estão escalados no mesmo dia/horário.'
      : error === 'dates'
        ? 'Datas inválidas.'
        : error === 'receivable'
          ? 'Informe um valor a receber válido (maior que zero).'
        : error === 'invalid'
          ? 'Preencha os campos obrigatórios.'
          : ''

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo contrato (Restaurante)</h1>
        <p className="mt-1 text-sm text-zinc-300">Contrato mensal com apresentações diárias e escala por dia.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{errorMessage}</div>
      ) : null}

      <form method="get" className="rounded-2xl border border-white/10 bg-white/5 p-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Nome do restaurante</span>
            <input name="name" defaultValue={restaurantName} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Endereço</span>
            <input name="address" defaultValue={address} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Cidade</span>
            <input name="city" defaultValue={city} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">UF</span>
            <input name="state" defaultValue={state} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Início (dd/mm/aaaa)</span>
            <input name="start" defaultValue={start} placeholder="01/04/2026" className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Término (dd/mm/aaaa)</span>
            <input name="end" defaultValue={end} placeholder="30/04/2026" className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Horário (HH:MM)</span>
            <input name="time" defaultValue={time} placeholder="20:00" className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Valor a Receber por Contrato</span>
            <MoneyInput
              name="receivable"
              defaultValue={receivable}
              required
              placeholder="R$ 0,00"
              className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10"
            />
          </label>
          <div className="flex items-end">
            <div className="text-sm text-zinc-400">
              Valor total a ser recebido no período do contrato (será distribuído conforme a periodicidade).
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Periodicidade de pagamento</span>
            <select name="freq" defaultValue={freq} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="DAILY">Diário</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="h-11 rounded-xl bg-white/5 px-5 text-sm font-medium text-zinc-50 hover:bg-white/10">
              Gerar dias para escala
            </button>
          </div>
        </div>
      </form>

      {days.length > 0 ? (
        <form action={createAction} className="rounded-2xl border border-white/10 bg-white/5 p-5 grid gap-4">
          <input type="hidden" name="restaurantName" value={restaurantName} />
          <input type="hidden" name="address" value={address} />
          <input type="hidden" name="city" value={city} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="start" value={start} />
          <input type="hidden" name="end" value={end} />
          <input type="hidden" name="time" value={time} />
          <input type="hidden" name="freq" value={freq} />
          <input type="hidden" name="receivable" value={receivable} />

          <div className="text-sm text-zinc-200">
            Selecione um ou mais músicos por dia. O valor do cachê é automático (base do músico), mas você pode sobrescrever
            por dia.
          </div>

          <div className="grid gap-3">
            {days.map((d) => {
              const key = toISODateKey(d)
              return (
                <details key={key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-50">{d.toLocaleDateString('pt-BR')}</summary>
                  <div className="mt-4 grid gap-2">
                    {musicians.map((m) => (
                      <div key={m.id} className="grid gap-2 sm:grid-cols-[auto,1fr,220px] sm:items-end">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" name={`day.${key}.${m.id}.selected`} className="h-4 w-4" />
                          <span className="text-sm text-zinc-200">
                            {m.user.name} {m.instrument ? `(${m.instrument})` : ''} · base {((m.baseCacheCents ?? 0) / 100).toFixed(2).replace('.', ',')}
                          </span>
                        </label>
                        <div className="text-sm text-zinc-400">{m.user.login ? `login: ${m.user.login}` : ''}</div>
                        <label className="grid gap-1">
                          <span className="text-xs text-zinc-400">Sobrescrever cachê (R$)</span>
                          <input
                            name={`day.${key}.${m.id}.cost`}
                            placeholder="(opcional)"
                            className="h-10 rounded-lg bg-white/5 px-3 text-zinc-50 ring-1 ring-white/10"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </details>
              )
            })}
          </div>

          <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">
            Criar contrato e gerar apresentações
          </button>
        </form>
      ) : null}
    </div>
  )
}
