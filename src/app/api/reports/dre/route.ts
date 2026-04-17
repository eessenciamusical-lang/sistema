import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'
import { createDreReportPdf } from '@/lib/pdf/dre-report'
import { renderToBuffer } from '@react-pdf/renderer'
import ExcelJS from 'exceljs'

export const runtime = 'nodejs'

function toStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function toEndOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function parseDateOnly(value: string | null) {
  if (!value) return null
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const dd = m[1]
  const mm = m[2]
  const yyyy = m[3]
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'pdf'
  const fromRaw = url.searchParams.get('from')
  const toRaw = url.searchParams.get('to')

  const fromDate = parseDateOnly(fromRaw)
  const toDate = parseDateOnly(toRaw)

  let evQuery = supabaseAdmin.from('Event').select('id,title,date').order('date', { ascending: true })
  if (fromDate) evQuery = evQuery.gte('date', toStartOfDay(fromDate).toISOString())
  if (toDate) evQuery = evQuery.lte('date', toEndOfDay(toDate).toISOString())
  const { data: events, error: evErr } = await evQuery
  if (evErr || !events) return new Response('Server error', { status: 500 })

  const eventIds = Array.from(new Set(events.map((e) => String(e.id))))
  const { data: contracts, error: cErr } =
    eventIds.length === 0
      ? { data: [] as Array<{ id: string; eventId: string }>, error: null as null | unknown }
      : await supabaseAdmin.from('Contract').select('id,eventId').eq('status', 'SIGNED').in('eventId', eventIds)
  if (cErr || !contracts) return new Response('Server error', { status: 500 })

  const contractIds = Array.from(new Set(contracts.map((c) => String(c.id))))

  const { data: assignments } =
    eventIds.length === 0
      ? { data: [] as Array<{ eventId: string; costCents: number | null }> }
      : await supabaseAdmin.from('Assignment').select('eventId,costCents').in('eventId', eventIds)
  const bandCostByEventId = new Map<string, number>()
  for (const a of assignments ?? []) {
    const key = String(a.eventId)
    bandCostByEventId.set(key, (bandCostByEventId.get(key) ?? 0) + (a.costCents ?? 0))
  }

  const { data: receivables } =
    contractIds.length === 0
      ? { data: [] as Array<{ contractId: string | null; amount: number }> }
      : await supabaseAdmin
          .from('Payment')
          .select('contractId,amount')
          .eq('direction', 'RECEIVABLE')
          .eq('status', 'RECEIVED')
          .in('contractId', contractIds)
  const receivedByContract = new Map<string, number>()
  for (const p of receivables ?? []) {
    if (!p.contractId) continue
    const key = String(p.contractId)
    receivedByContract.set(key, (receivedByContract.get(key) ?? 0) + (Number(p.amount) || 0))
  }

  const eventById = new Map(events.map((e) => [String(e.id), e]))

  const rows = contracts.map((c) => {
    const ev = eventById.get(String(c.eventId))
    const bandCostCents = bandCostByEventId.get(String(c.eventId)) ?? 0
    const receivedCents = receivedByContract.get(String(c.id)) ?? 0
    return {
      contractId: String(c.id),
      eventDate: ev?.date ? new Date(String(ev.date)) : new Date(),
      eventTitle: ev?.title ? String(ev.title) : 'Evento',
      receivedCents,
      bandCostCents,
      profitCents: receivedCents - bandCostCents,
    }
  })

  const periodLabel = `Período: ${fromRaw || '—'} até ${toRaw || '—'}`

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('DRE')

    sheet.columns = [
      { header: 'Data Evento', key: 'eventDate', width: 16 },
      { header: 'Evento', key: 'eventTitle', width: 30 },
      { header: 'Recebido (centavos)', key: 'receivedCents', width: 18 },
      { header: 'Custo (centavos)', key: 'bandCostCents', width: 18 },
      { header: 'Resultado (centavos)', key: 'profitCents', width: 20 },
      { header: 'Recebido (R$)', key: 'receivedBRL', width: 14 },
      { header: 'Custo (R$)', key: 'costBRL', width: 14 },
      { header: 'Resultado (R$)', key: 'profitBRL', width: 14 },
      { header: 'Contrato', key: 'contractId', width: 26 },
    ]

    for (const r of rows) {
      sheet.addRow({
        eventDate: r.eventDate.toISOString().slice(0, 10),
        eventTitle: r.eventTitle,
        receivedCents: r.receivedCents,
        bandCostCents: r.bandCostCents,
        profitCents: r.profitCents,
        receivedBRL: (r.receivedCents / 100).toFixed(2).replace('.', ','),
        costBRL: (r.bandCostCents / 100).toFixed(2).replace('.', ','),
        profitBRL: (r.profitCents / 100).toFixed(2).replace('.', ','),
        contractId: r.contractId,
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const body = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer as Uint8Array)
    return new Response(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="dre.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  }

  const buffer = await renderToBuffer(
    createDreReportPdf({
      title: 'Relatório DRE',
      periodLabel,
      rows: rows.map((r) => ({
        eventDate: r.eventDate,
        eventTitle: r.eventTitle,
        receivedCents: r.receivedCents,
        bandCostCents: r.bandCostCents,
        profitCents: r.profitCents,
      })),
    }),
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="dre.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
