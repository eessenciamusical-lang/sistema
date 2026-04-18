import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'
import { isDbAvailable } from '@/lib/db-availability'
import { demoTaskCreate, demoTasksForDay } from '@/lib/demo-task-store'
import { newId } from '@/lib/ids'
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

  const { data, error } = await supabaseAdmin
    .from('TaskReminder')
    .select('id,title,description,startAt,durationMin,color,completed')
    .eq('userId', session.user.id)
    .gte('startAt', start.toISOString())
    .lt('startAt', end.toISOString())
    .order('startAt', { ascending: true })
  if (error) return new Response('Server error', { status: 500 })
  const tasks = (data ?? []).map((t) => ({
    ...t,
    startAt: new Date(String(t.startAt)).toISOString(),
  }))

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

  const { data: created, error } = await supabaseAdmin
    .from('TaskReminder')
    .insert({
      id: newId(),
      userId: session.user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      startAt: startAt.toISOString(),
      durationMin: 30,
      color: parsed.data.color ?? 'blue',
      completed: false,
    })
    .select('id,title,description,startAt,durationMin,color,completed')
    .single()

  if (error) {
    if ((error as unknown as { code?: string }).code === '23505') return new Response('Conflict', { status: 409 })
    return new Response('Server error', { status: 500 })
  }

  return Response.json({ task: { ...created, startAt: new Date(String(created.startAt)).toISOString() } })
}
