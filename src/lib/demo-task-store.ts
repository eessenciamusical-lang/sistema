type DemoTask = {
  id: string
  userId: string
  title: string
  description: string | null
  startAt: string
  durationMin: number
  color: string
  completed: boolean
}

const globalForTasks = globalThis as unknown as {
  __demoTasks?: Map<string, DemoTask>
}

function store() {
  if (!globalForTasks.__demoTasks) globalForTasks.__demoTasks = new Map()
  return globalForTasks.__demoTasks
}

export function demoTasksForDay(userId: string, start: Date, end: Date) {
  const list: DemoTask[] = []
  for (const t of store().values()) {
    if (t.userId !== userId) continue
    const ts = new Date(t.startAt).getTime()
    if (ts >= start.getTime() && ts < end.getTime()) list.push(t)
  }
  list.sort((a, b) => a.startAt.localeCompare(b.startAt))
  return list
}

export function demoTaskCreate(task: Omit<DemoTask, 'id'>) {
  const id = `demo_task_${Math.random().toString(36).slice(2)}`
  const t: DemoTask = { id, ...task }
  const key = `${t.userId}::${t.startAt}`
  if (store().has(key)) return { ok: false as const, conflict: true as const }
  store().set(key, t)
  return { ok: true as const, task: t }
}

export function demoTaskUpdate(userId: string, id: string, patch: Partial<Omit<DemoTask, 'id' | 'userId'>>) {
  const current = Array.from(store().values()).find((x) => x.id === id && x.userId === userId)
  if (!current) return { ok: false as const, notFound: true as const }

  const next: DemoTask = { ...current, ...patch }
  const oldKey = `${current.userId}::${current.startAt}`
  const newKey = `${current.userId}::${next.startAt}`
  if (newKey !== oldKey && store().has(newKey)) return { ok: false as const, conflict: true as const }

  store().delete(oldKey)
  store().set(newKey, next)
  return { ok: true as const, task: next }
}

export function demoTaskDelete(userId: string, id: string) {
  const current = Array.from(store().values()).find((x) => x.id === id && x.userId === userId)
  if (!current) return { ok: false as const, notFound: true as const }
  store().delete(`${current.userId}::${current.startAt}`)
  return { ok: true as const }
}

