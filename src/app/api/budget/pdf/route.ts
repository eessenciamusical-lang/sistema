import { createBudgetPdf } from '@/lib/pdf/budget-pdf'
import { renderToBuffer } from '@react-pdf/renderer'
import { z } from 'zod'

export const runtime = 'nodejs'

const payloadSchema = z.object({
  fullName: z.string().min(2),
  company: z.string().optional().nullable(),
  youAre: z.array(z.string().min(1)).min(1),
  youAreOther: z.string().optional().nullable(),
  eventTypes: z.array(z.string().min(1)).min(1),
  eventOther: z.string().optional().nullable(),
  coupleName: z.string().optional().nullable(),
  eventDateTimeCity: z.string().min(3),
  expectations: z.string().min(10),
  phone: z.string().min(6),
  email: z.string().email(),
  instruments: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .optional()
    .default([]),
  notes: z.string().optional().nullable(),
  budgetValueCents: z.number().int().min(0).optional().default(0),
  discountPct: z.number().min(0).max(100).optional().default(0),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) return new Response('Bad request', { status: 400 })

  const data = parsed.data

  const youAre = Array.from(new Set(data.youAre.map((s) => s.trim()).filter(Boolean)))
  const youAreOther = data.youAreOther?.trim() || ''
  const youAreFinal = youAreOther ? Array.from(new Set([...youAre, youAreOther])) : youAre

  const eventTypes = Array.from(new Set(data.eventTypes.map((s) => s.trim()).filter(Boolean)))
  const eventOther = data.eventOther?.trim() || ''
  const eventFinal = eventOther ? Array.from(new Set([...eventTypes, eventOther])) : eventTypes

  const instruments = (data.instruments ?? []).filter((i) => i.name.trim() && Number.isFinite(i.qty) && i.qty >= 1)

  const safeDiscount = Math.max(0, Math.min(100, data.discountPct ?? 0))
  const originalCents = Math.max(0, data.budgetValueCents ?? 0)
  const discountCents = Math.round((originalCents * safeDiscount) / 100)
  const finalCents = Math.max(0, originalCents - discountCents)

  const buffer = await renderToBuffer(
    createBudgetPdf({
      agencyName: 'Essência Musical',
      client: {
        fullName: data.fullName.trim(),
        company: data.company?.trim() || null,
        phone: data.phone.trim(),
        email: data.email.trim(),
      },
      request: {
        youAre: youAreFinal,
        eventTypes: eventFinal,
        coupleName: data.coupleName?.trim() || null,
        eventDateTimeCity: data.eventDateTimeCity.trim(),
        expectations: data.expectations.trim(),
        instruments,
      },
      pricing:
        originalCents > 0
          ? {
              originalCents,
              discountPct: safeDiscount,
              discountCents,
              finalCents,
            }
          : null,
    }),
  )

  const fileBase = data.fullName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="orcamento-${fileBase || 'cliente'}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
