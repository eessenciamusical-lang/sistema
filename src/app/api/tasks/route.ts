import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoTaskCreate, demoTasksForDay } from '@/lib/demo-task-store'
import { z } from 'zod'

export const runtime = 'nodejs'

function parseDay(day: string) {
  const m = day.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseISODateTime(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function isHalfHourAligned(d: Date) {
  return d.getSeconds() === 0 && d.getMilliseconds() === 0 && (d.getMinutes() === 0 || d.getMinutes() === 30)
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const day = url.searchParams.get('day')
  if (!day) return new Response('Bad request', { status: 400 })
  const start = parseDay(day)
  if (!start) return new Response('Bad request', { status: 400 })
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const dbOk = await isDbAvailable()
  if (!dbOk) {
    const tasks = demoTasksForDay(session.user.id, start, end)
    return Response.json({ tasks })
  }

  const tasks = await prisma.taskReminder.findMany({
    where: { userId: session.user.id, startAt: { gte: start, lt: end } },
    orderBy: { startAt: 'asc' },
  })

  return Response.json({ tasks })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = z
    .object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      startAt: z.string().min(1),
      color: z.string().min(1).optional(),
    })
    .safeParse(body)

  if (!parsed.success) return new Response('Bad request', { status: 400 })

  const startAt = parseISODateTime(parsed.data.startAt)
  if (!startAt || !isHalfHourAligned(startAt)) return new Response('Bad request', { status: 400 })

  const startOfDay = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)
  if (startAt < startOfDay || startAt >= endOfDay) return new Response('Bad request', { status: 400 })

  const dbOk = await isDbAvailable()
  if (!dbOk) {
    const created = demoTaskCreate({
      userId: session.user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      startAt: startAt.toISOString(),
      durationMin: 30,
      color: parsed.data.color ?? 'blue',
      completed: false,
    })
    if (!created.ok && created.conflict) return new Response('Conflict', { status: 409 })
    if (!created.ok) return new Response('Bad request', { status: 400 })
    return Response.json({ task: created.task })
  }

  const existing = await prisma.taskReminder.findUnique({
    where: { userId_startAt: { userId: session.user.id, startAt } },
    select: { id: true },
  })
  if (existing) return new Response('Conflict', { status: 409 })

  const task = await prisma.taskReminder.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      startAt,
      durationMin: 30,
      color: parsed.data.color ?? 'blue',
    },
  })

  return Response.json({ task })
}
