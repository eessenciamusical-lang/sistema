import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoTaskDelete, demoTaskUpdate } from '@/lib/demo-task-store'
import { z } from 'zod'

export const runtime = 'nodejs'

function parseISODateTime(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function isHalfHourAligned(d: Date) {
  return d.getSeconds() === 0 && d.getMilliseconds() === 0 && (d.getMinutes() === 0 || d.getMinutes() === 30)
}

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      startAt: z.string().min(1).optional(),
      color: z.string().min(1).optional(),
      completed: z.boolean().optional(),
    })
    .safeParse(body)
  if (!parsed.success) return new Response('Bad request', { status: 400 })

  const dbOk = await isDbAvailable()
  if (!dbOk) {
    const patch: { title?: string; description?: string | null; startAt?: string; color?: string; completed?: boolean } = {}

    if (parsed.data.title != null) {
      const t = parsed.data.title.trim()
      if (!t) return new Response('Bad request', { status: 400 })
      patch.title = t
    }
    if (parsed.data.description !== undefined) patch.description = parsed.data.description?.trim() || null
    if (parsed.data.color != null) patch.color = parsed.data.color
    if (parsed.data.completed != null) patch.completed = parsed.data.completed

    if (parsed.data.startAt != null) {
      const d = parseISODateTime(parsed.data.startAt)
      if (!d || !isHalfHourAligned(d)) return new Response('Bad request', { status: 400 })
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
      const endOfDay = new Date(startOfDay)
      endOfDay.setDate(endOfDay.getDate() + 1)
      if (d < startOfDay || d >= endOfDay) return new Response('Bad request', { status: 400 })
      patch.startAt = d.toISOString()
    }

    const updated = demoTaskUpdate(session.user.id, id, patch)
    if (!updated.ok && updated.notFound) return new Response('Not found', { status: 404 })
    if (!updated.ok && updated.conflict) return new Response('Conflict', { status: 409 })
    if (!updated.ok) return new Response('Bad request', { status: 400 })
    return Response.json({ task: updated.task })
  }

  const task = await prisma.taskReminder.findUnique({ where: { id }, select: { id: true, userId: true, startAt: true } })
  if (!task || task.userId !== session.user.id) return new Response('Not found', { status: 404 })

  let startAt: Date | undefined
  if (parsed.data.startAt != null) {
    const d = parseISODateTime(parsed.data.startAt)
    if (!d || !isHalfHourAligned(d)) return new Response('Bad request', { status: 400 })
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)
    if (d < startOfDay || d >= endOfDay) return new Response('Bad request', { status: 400 })

    const existing = await prisma.taskReminder.findUnique({
      where: { userId_startAt: { userId: session.user.id, startAt: d } },
      select: { id: true },
    })
    if (existing && existing.id !== id) return new Response('Conflict', { status: 409 })
    startAt = d
  }

  const updated = await prisma.taskReminder.update({
    where: { id },
    data: {
      ...(parsed.data.title != null ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description?.trim() || null } : {}),
      ...(startAt ? { startAt } : {}),
      ...(parsed.data.color != null ? { color: parsed.data.color } : {}),
      ...(parsed.data.completed != null ? { completed: parsed.data.completed } : {}),
    },
  })

  return Response.json({ task: updated })
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 })
  const { id } = await params

  const dbOk = await isDbAvailable()
  if (!dbOk) {
    const deleted = demoTaskDelete(session.user.id, id)
    if (!deleted.ok && deleted.notFound) return new Response('Not found', { status: 404 })
    if (!deleted.ok) return new Response('Bad request', { status: 400 })
    return new Response('ok')
  }

  const task = await prisma.taskReminder.findUnique({ where: { id }, select: { id: true, userId: true } })
  if (!task || task.userId !== session.user.id) return new Response('Not found', { status: 404 })

  await prisma.taskReminder.delete({ where: { id } })
  return new Response('ok')
}
