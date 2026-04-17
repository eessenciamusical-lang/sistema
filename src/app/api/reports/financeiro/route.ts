import { auth } from '@/auth'
import { hasSupabaseEnv, supabaseAdmin } from '@/lib/db'
import { createFinanceReportPdf } from '@/lib/pdf/finance-report'
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
  if (!hasSupabaseEnv()) return new Response('Server not configured', { status: 500 })

  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'pdf'
  const fromRaw = url.searchParams.get('from')
  const toRaw = url.searchParams.get('to')
  const directionRaw = url.searchParams.get('direction')
  const statusRaw = url.searchParams.get('status')

  const fromDate = parseDateOnly(fromRaw)
  const toDate = parseDateOnly(toRaw)

  const directionFilter = directionRaw === 'RECEIVABLE' || directionRaw === 'PAYABLE' ? directionRaw : null
  const statusFilter =
    statusRaw === 'PENDING' || statusRaw === 'RECEIVED' || statusRaw === 'REFUNDED' || statusRaw === 'PAID' || statusRaw === 'CANCELLED'
      ? statusRaw
      : null

  let q = supabaseAdmin.from('Payment').select('id,eventId,createdAt,direction,status,amount,note').order('createdAt', { ascending: true })
  if (directionFilter) q = q.eq('direction', directionFilter)
  if (statusFilter) q = q.eq('status', statusFilter)
  if (fromDate) q = q.gte('createdAt', toStartOfDay(fromDate).toISOString())
  if (toDate) q = q.lte('createdAt', toEndOfDay(toDate).toISOString())

  const { data: rows, error } = await q
  if (error) return new Response('Server error', { status: 500 })

  const eventIds = Array.from(new Set((rows ?? []).map((p) => String(p.eventId)).filter(Boolean)))
  const { data: events } =
    eventIds.length === 0 ? { data: [] as Array<{ id: string; title: string; date: string }> } : await supabaseAdmin.from('Event').select('id,title,date').in('id', eventIds)
  const eventById = new Map((events ?? []).map((e) => [String(e.id), e]))

  const payments = (rows ?? []).map((p) => {
    const ev = eventById.get(String(p.eventId))
    return {
      id: String(p.id),
      createdAt: new Date(String(p.createdAt)),
      direction: p.direction as 'RECEIVABLE' | 'PAYABLE',
      status: p.status as 'PENDING' | 'RECEIVED' | 'REFUNDED' | 'PAID' | 'CANCELLED',
      amount: Number(p.amount) || 0,
      note: (p.note as string | null) ?? null,
      event: { title: ev?.title ? String(ev.title) : 'Evento', date: ev?.date ? new Date(String(ev.date)) : new Date() },
    }
  })

  const periodLabel = `Período: ${fromRaw || '—'} até ${toRaw || '—'}`

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Financeiro')

    sheet.columns = [
      { header: 'Data Lançamento', key: 'createdAt', width: 16 },
      { header: 'Evento', key: 'event', width: 28 },
      { header: 'Data Evento', key: 'eventDate', width: 16 },
      { header: 'Direção', key: 'direction', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Valor (centavos)', key: 'amount', width: 16 },
      { header: 'Valor (R$)', key: 'amountBRL', width: 14 },
      { header: 'Observação', key: 'note', width: 30 },
    ]

    for (const p of payments) {
      sheet.addRow({
        createdAt: p.createdAt.toISOString().slice(0, 10),
        event: p.event.title,
        eventDate: p.event.date.toISOString().slice(0, 10),
        direction: p.direction === 'RECEIVABLE' ? 'A receber' : 'A pagar',
        status: p.status,
        amount: p.amount,
        amountBRL: (p.amount / 100).toFixed(2).replace('.', ','),
        note: p.note ?? '',
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const body = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer as Uint8Array)
    return new Response(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="financeiro.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  }

  const buffer = await renderToBuffer(
    createFinanceReportPdf({
      title: 'Relatório Financeiro',
      periodLabel,
      rows: payments.map((p) => ({
        createdAt: p.createdAt,
        eventTitle: p.event.title,
        direction: p.direction,
        status: p.status,
        amount: p.amount,
        note: p.note,
      })),
    }),
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="financeiro.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
