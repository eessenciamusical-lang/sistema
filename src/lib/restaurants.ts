import { parseDateBR } from '@/lib/format'

export function parseTimeHHMM(value: string) {
  const m = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!m) return null
  return { hh: Number(m[1]), mm: Number(m[2]) }
}

export function toISODateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function enumerateDaysInclusive(start: Date, end: Date) {
  const days: Date[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0)
  while (cur.getTime() <= last.getTime()) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function parseDateRangeFromBR(start: string, end: string) {
  const startDate = parseDateBR(start)
  const endDate = parseDateBR(end)
  if (!startDate || !endDate) return null
  if (endDate.getTime() < startDate.getTime()) return null
  return { startDate, endDate }
}
