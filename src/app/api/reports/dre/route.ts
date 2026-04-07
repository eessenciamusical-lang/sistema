import { auth } from '@/auth'
import { prisma } from '@/lib/db'
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

  const contracts = await prisma.contract.findMany({
    where: {
      status: 'SIGNED',
      ...(fromDate || toDate
        ? {
            event: {
              date: {
                ...(fromDate ? { gte: toStartOfDay(fromDate) } : {}),
                ...(toDate ? { lte: toEndOfDay(toDate) } : {}),
              },
            },
          }
        : {}),
    },
    include: { event: { include: { assignments: true } } },
    orderBy: { event: { date: 'asc' } },
  })

  const contractIds = contracts.map((c) => c.id)
  const receivables =
    contractIds.length === 0
      ? []
      : await prisma.payment.findMany({
          where: { contractId: { in: contractIds }, direction: 'RECEIVABLE' },
          select: { contractId: true, amount: true, status: true },
        })

  const receivedByContract = new Map<string, number>()
  for (const p of receivables) {
    if (!p.contractId) continue
    if (p.status !== 'RECEIVED') continue
    receivedByContract.set(p.contractId, (receivedByContract.get(p.contractId) ?? 0) + p.amount)
  }

  const rows = contracts.map((c) => {
    const bandCostCents = c.event.assignments.reduce((sum, a) => sum + (a.costCents ?? 0), 0)
    const receivedCents = receivedByContract.get(c.id) ?? 0
    return {
      contractId: c.id,
      eventDate: c.event.date,
      eventTitle: c.event.title,
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
