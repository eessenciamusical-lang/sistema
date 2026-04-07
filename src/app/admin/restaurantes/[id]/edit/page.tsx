import { prisma } from '@/lib/db'
import { parseDateBR } from '@/lib/format'
import { MoneyInput } from '@/components/money-input'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

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

export default async function RestauranteContratoEditPage({ params }: Props) {
  const { id } = await params
  const contract = await prisma.restaurantContract.findUnique({
    where: { id },
    include: { restaurant: true },
  })
  if (!contract) redirect('/admin/restaurantes')

  async function updateAction(formData: FormData) {
    'use server'
    const parsed = z
      .object({
        name: z.string().min(2),
        address: z.string().min(3),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        start: z.string().min(8),
        end: z.string().min(8),
        time: z.string().min(4),
        freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
        receivable: z.string().min(1),
        status: z.enum(['ACTIVE', 'ENDED', 'CANCELLED']),
      })
      .safeParse({
        name: String(formData.get('name') ?? '').trim(),
        address: String(formData.get('address') ?? '').trim(),
        city: String(formData.get('city') ?? '').trim(),
        state: String(formData.get('state') ?? '').trim(),
        start: String(formData.get('start') ?? '').trim(),
        end: String(formData.get('end') ?? '').trim(),
        time: String(formData.get('time') ?? '').trim(),
        freq: String(formData.get('freq') ?? '').trim(),
        receivable: String(formData.get('receivable') ?? '').trim(),
        status: String(formData.get('status') ?? '').trim(),
      })
    if (!parsed.success) redirect(`/admin/restaurantes/${id}/edit`)

    const s = parseDateBR(parsed.data.start)
    const e = parseDateBR(parsed.data.end)
    if (!s || !e || e.getTime() < s.getTime()) redirect(`/admin/restaurantes/${id}/edit`)

    const receivableTotalCents = parseBRLToCents(parsed.data.receivable)
    if (!receivableTotalCents || receivableTotalCents <= 0) redirect(`/admin/restaurantes/${id}/edit`)

    await prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: contract!.restaurantId },
        data: {
          name: parsed.data.name,
          address: parsed.data.address,
          city: parsed.data.city || null,
          state: parsed.data.state || null,
        },
      })

      await tx.restaurantContract.update({
        where: { id },
        data: {
          startDate: s,
          endDate: e,
          time: parsed.data.time,
          paymentFrequency: parsed.data.freq,
          receivableTotalCents,
          status: parsed.data.status,
        },
      })

      const events = await tx.event.findMany({
        where: { restaurantContractId: id, eventType: 'RESTAURANT' },
        orderBy: { date: 'asc' },
        select: { id: true, date: true },
      })

      await tx.payment.deleteMany({
        where: {
          restaurantContractId: id,
          type: 'RESTAURANT_RECEIVABLE',
          status: 'PENDING',
        },
      })

      if (events.length === 0) return

      if (parsed.data.freq === 'DAILY') {
        const daily = distributeCents(receivableTotalCents, events.length)
        for (let i = 0; i < events.length; i++) {
          const ev = events[i]
          await tx.payment.create({
            data: {
              eventId: ev.id,
              restaurantContractId: id,
              type: 'RESTAURANT_RECEIVABLE',
              direction: 'RECEIVABLE',
              amount: daily[i] ?? 0,
              status: 'PENDING',
              dueDate: ev.date,
              note: `Restaurante (${parsed.data.name}) - diário`,
            },
          })
        }
      } else if (parsed.data.freq === 'WEEKLY') {
        const daily = distributeCents(receivableTotalCents, events.length)
        for (let i = 0; i < events.length; i += 7) {
          const slice = events.slice(i, i + 7)
          const amount = slice.reduce((sum, _ev, idx) => sum + (daily[i + idx] ?? 0), 0)
          const last = slice[slice.length - 1]
          const first = slice[0]
          await tx.payment.create({
            data: {
              eventId: last.id,
              restaurantContractId: id,
              type: 'RESTAURANT_RECEIVABLE',
              direction: 'RECEIVABLE',
              amount,
              status: 'PENDING',
              dueDate: last.date,
              note: `Restaurante (${parsed.data.name}) - semanal ${first.date.toISOString().slice(0, 10)} a ${last.date
                .toISOString()
                .slice(0, 10)}`,
            },
          })
        }
      } else {
        const first = events[0]
        const last = events[events.length - 1]
        await tx.payment.create({
          data: {
            eventId: last.id,
            restaurantContractId: id,
            type: 'RESTAURANT_RECEIVABLE',
            direction: 'RECEIVABLE',
            amount: receivableTotalCents,
            status: 'PENDING',
            dueDate: last.date,
            note: `Restaurante (${parsed.data.name}) - mensal ${first.date.toISOString().slice(0, 10)} a ${last.date
              .toISOString()
              .slice(0, 10)}`,
          },
        })
      }
    })

    revalidatePath(`/admin/restaurantes/${id}`)
    revalidatePath('/admin/restaurantes')
    redirect(`/admin/restaurantes/${id}`)
  }

  const startStr = contract.startDate.toLocaleDateString('pt-BR')
  const endStr = contract.endDate.toLocaleDateString('pt-BR')
  const receivableStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    contract.receivableTotalCents / 100,
  )

  return (
    <div className="grid gap-6 max-w-2xl">
      <Link className="text-sm text-amber-200/90 hover:text-amber-200" href={`/admin/restaurantes/${id}`}>
        ← Voltar
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar contrato</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Edita dados do restaurante e configurações do contrato. Não regenera automaticamente as apresentações já criadas.
        </p>
      </div>

      <form action={updateAction} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Nome do restaurante</span>
            <input name="name" defaultValue={contract.restaurant.name} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Endereço</span>
            <input name="address" defaultValue={contract.restaurant.address} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Cidade</span>
            <input name="city" defaultValue={contract.restaurant.city ?? ''} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">UF</span>
            <input name="state" defaultValue={contract.restaurant.state ?? ''} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Início (dd/mm/aaaa)</span>
            <input name="start" defaultValue={startStr} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Término (dd/mm/aaaa)</span>
            <input name="end" defaultValue={endStr} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Horário (HH:MM)</span>
            <input name="time" defaultValue={contract.time} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10" />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Valor a Receber por Contrato</span>
          <MoneyInput
            name="receivable"
            defaultValue={receivableStr}
            required
            placeholder="R$ 0,00"
            className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Periodicidade</span>
            <select name="freq" defaultValue={contract.paymentFrequency} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="DAILY">Diário</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Status</span>
            <select name="status" defaultValue={contract.status} className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10">
              <option value="ACTIVE">Ativo</option>
              <option value="ENDED">Encerrado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
        </div>

        <button className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200">
          Salvar
        </button>
      </form>
    </div>
  )
}
