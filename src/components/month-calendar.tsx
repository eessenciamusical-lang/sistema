'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

export type MonthCalendarEvent = {
  id: string
  title: string
  dateISO: string
  dateKey: string
  eventType: string
  clientName: string | null
  locationName: string | null
  musicians: string[]
}

type TaskReminder = {
  id: string
  title: string
  description: string | null
  startAt: string
  durationMin: number
  color: string
  completed: boolean
}

function toMonthLabel(monthISO: string) {
  const [y, m] = monthISO.split('-').map((x) => Number(x))
  const d = new Date(y, (m ?? 1) - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
}

function monthToPrev(monthISO: string) {
  const [y, m] = monthISO.split('-').map((x) => Number(x))
  const d = new Date(y, (m ?? 1) - 2, 1)
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

function monthToNext(monthISO: string) {
  const [y, m] = monthISO.split('-').map((x) => Number(x))
  const d = new Date(y, (m ?? 1), 1)
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

function dateKeyLocal(d: Date) {
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function eventTypeLabel(eventType: string) {
  switch (eventType) {
    case 'RESTAURANT':
      return 'Restaurante'
    case 'WEDDING':
      return 'Casamento'
    case 'CEREMONY':
      return 'Cerimônia'
    case 'RECEPTION':
      return 'Recepção'
    default:
      return 'Evento'
  }
}

function eventTypeBadgeClass(eventType: string) {
  switch (eventType) {
    case 'RESTAURANT':
      return 'bg-sky-400/15 text-sky-200 ring-sky-400/20'
    case 'WEDDING':
      return 'bg-amber-300/15 text-amber-200 ring-amber-300/20'
    case 'CEREMONY':
      return 'bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/20'
    case 'RECEPTION':
      return 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/20'
    default:
      return 'bg-white/10 text-zinc-200 ring-white/10'
  }
}

function taskColorClass(color: string) {
  switch (color) {
    case 'green':
      return 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/20'
    case 'amber':
      return 'bg-amber-300/15 text-amber-200 ring-amber-300/20'
    case 'pink':
      return 'bg-pink-400/15 text-pink-200 ring-pink-400/20'
    case 'purple':
      return 'bg-violet-400/15 text-violet-200 ring-violet-400/20'
    case 'zinc':
      return 'bg-white/10 text-zinc-200 ring-white/10'
    case 'blue':
    default:
      return 'bg-sky-400/15 text-sky-200 ring-sky-400/20'
  }
}

function makeStartAtISO(dayKey: string, hh: number, mm: number) {
  const [y, m, d] = dayKey.split('-').map((x) => Number(x))
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, 0, 0)
  return dt.toISOString()
}

function timeLabel(hh: number, mm: number) {
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function MonthCalendar({
  basePath,
  monthISO,
  events,
  tasksCountByDay,
}: {
  basePath: string
  monthISO: string
  events: MonthCalendarEvent[]
  tasksCountByDay?: Record<string, number>
}) {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'events' | 'tasks'>('events')
  const [tasks, setTasks] = useState<TaskReminder[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null)
  const [editorStartAt, setEditorStartAt] = useState<string>('')
  const [editorTitle, setEditorTitle] = useState<string>('')
  const [editorDescription, setEditorDescription] = useState<string>('')
  const [editorColor, setEditorColor] = useState<string>('blue')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)

  const byDay = useMemo(() => {
    const map: Record<string, MonthCalendarEvent[]> = {}
    for (const e of events) {
      if (!map[e.dateKey]) map[e.dateKey] = []
      map[e.dateKey].push(e)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    }
    return map
  }, [events])

  const todayKey = useMemo(() => dateKeyLocal(new Date()), [])

  const days = useMemo(() => {
    const [y, m] = monthISO.split('-').map((x) => Number(x))
    const first = new Date(y, (m ?? 1) - 1, 1)
    const daysInMonth = new Date(y, (m ?? 1), 0).getDate()
    const mondayIndex = (first.getDay() + 6) % 7
    const totalCells = 42
    const list: Array<{ key: string; day: number; inMonth: boolean }> = []
    for (let i = 0; i < totalCells; i++) {
      const dayOffset = i - mondayIndex
      const d = new Date(first.getFullYear(), first.getMonth(), 1 + dayOffset)
      const inMonth = dayOffset >= 0 && dayOffset < daysInMonth
      list.push({ key: dateKeyLocal(d), day: d.getDate(), inMonth })
    }
    return list
  }, [monthISO])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (editorOpen) {
        setEditorOpen(false)
        return
      }
      setSelectedDayKey(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editorOpen])

  const selectedEvents = selectedDayKey ? byDay[selectedDayKey] ?? [] : []
  const prev = monthToPrev(monthISO)
  const next = monthToNext(monthISO)

  useEffect(() => {
    if (!selectedDayKey) return
    setActiveTab('events')
    setTasks([])
    setTasksError(null)
    setEditorOpen(false)
    setDraggingTaskId(null)
    setTasksLoading(true)
    fetch(`/api/tasks?day=${encodeURIComponent(selectedDayKey)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const data = await r.json()
        const list = Array.isArray(data?.tasks) ? (data.tasks as TaskReminder[]) : []
        setTasks(list)
      })
      .catch(() => setTasksError('Não foi possível carregar as tarefas deste dia.'))
      .finally(() => setTasksLoading(false))
  }, [selectedDayKey])

  const tasksByStartAt = useMemo(() => {
    const map = new Map<string, TaskReminder>()
    for (const t of tasks) map.set(t.startAt, t)
    return map
  }, [tasks])

  const slots = useMemo(() => {
    const list: Array<{ hh: number; mm: number }> = []
    for (let h = 0; h < 24; h++) {
      list.push({ hh: h, mm: 0 })
      list.push({ hh: h, mm: 30 })
    }
    return list
  }, [])

  async function refreshTasks(dayKey: string) {
    setTasksLoading(true)
    setTasksError(null)
    try {
      const r = await fetch(`/api/tasks?day=${encodeURIComponent(dayKey)}`)
      if (!r.ok) throw new Error(String(r.status))
      const data = await r.json()
      const list = Array.isArray(data?.tasks) ? (data.tasks as TaskReminder[]) : []
      setTasks(list)
    } catch {
      setTasksError('Não foi possível carregar as tarefas deste dia.')
    } finally {
      setTasksLoading(false)
    }
  }

  function openCreate(dayKey: string, hh: number, mm: number) {
    setEditorMode('create')
    setEditorTaskId(null)
    setEditorStartAt(makeStartAtISO(dayKey, hh, mm))
    setEditorTitle('')
    setEditorDescription('')
    setEditorColor('blue')
    setEditorOpen(true)
  }

  function openEdit(t: TaskReminder) {
    setEditorMode('edit')
    setEditorTaskId(t.id)
    setEditorStartAt(t.startAt)
    setEditorTitle(t.title)
    setEditorDescription(t.description ?? '')
    setEditorColor(t.color)
    setEditorOpen(true)
  }

  async function saveEditor(dayKey: string) {
    const payload =
      editorMode === 'create'
        ? { title: editorTitle, description: editorDescription || null, startAt: editorStartAt, color: editorColor }
        : { title: editorTitle, description: editorDescription || null, startAt: editorStartAt, color: editorColor }

    const url = editorMode === 'create' ? '/api/tasks' : `/api/tasks/${editorTaskId}`
    const method = editorMode === 'create' ? 'POST' : 'PATCH'

    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.status === 409) {
        setTasksError('Já existe uma tarefa neste horário. Escolha outro intervalo.')
        return
      }
      if (!r.ok) {
        setTasksError('Não foi possível salvar a tarefa. Verifique os campos.')
        return
      }
      setEditorOpen(false)
      await refreshTasks(dayKey)
    } catch {
      setTasksError('Não foi possível salvar a tarefa.')
    }
  }

  async function toggleCompleted(dayKey: string, t: TaskReminder) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)))
    try {
      const r = await fetch(`/api/tasks/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !t.completed }),
      })
      if (!r.ok) await refreshTasks(dayKey)
    } catch {
      await refreshTasks(dayKey)
    }
  }

  async function removeTask(dayKey: string, id: string) {
    try {
      const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        setTasksError('Não foi possível excluir a tarefa.')
        return
      }
      setEditorOpen(false)
      await refreshTasks(dayKey)
    } catch {
      setTasksError('Não foi possível excluir a tarefa.')
    }
  }

  async function moveTask(dayKey: string, id: string, startAt: string) {
    try {
      const r = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt }),
      })
      if (r.status === 409) {
        setTasksError('Este horário já está ocupado.')
        return
      }
      if (!r.ok) {
        setTasksError('Não foi possível mover a tarefa.')
        return
      }
      await refreshTasks(dayKey)
    } catch {
      setTasksError('Não foi possível mover a tarefa.')
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  useEffect(() => {
    if (!selectedDayKey) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const now = Date.now()
    const cutoff = now + 24 * 60 * 60 * 1000
    const timeouts: number[] = []
    for (const t of tasks) {
      if (t.completed) continue
      const ts = new Date(t.startAt).getTime()
      if (ts <= now || ts > cutoff) continue
      const delay = ts - now
      const id = window.setTimeout(() => {
        try {
          new Notification('Lembrete', { body: `${t.title} (${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(t.startAt))})` })
        } catch {}
      }, delay)
      timeouts.push(id)
    }
    return () => {
      for (const id of timeouts) window.clearTimeout(id)
    }
  }, [selectedDayKey, tasks])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium capitalize text-zinc-50">{toMonthLabel(monthISO)}</div>
        <div className="flex items-center gap-2">
          <Link
            href={`${basePath}?month=${prev}`}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-white/5 px-3 text-sm text-zinc-50 hover:bg-white/10"
          >
            ←
          </Link>
          <Link
            href={`${basePath}?month=${next}`}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-white/5 px-3 text-sm text-zinc-50 hover:bg-white/10"
          >
            →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-zinc-300">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="px-2 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dayEvents = byDay[d.key] ?? []
          const isToday = d.key === todayKey
          const taskCount = tasksCountByDay?.[d.key] ?? 0
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelectedDayKey(d.key)}
              className={[
                'min-h-[84px] rounded-2xl border p-2 text-left transition',
                d.inMonth ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-white/5 bg-white/[0.03] text-zinc-500',
                isToday ? 'ring-2 ring-amber-300/50' : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-zinc-50">{d.day}</div>
                <div className="text-[11px] text-zinc-300">
                  {dayEvents.length ? `${dayEvents.length} ev` : ''}{dayEvents.length && taskCount ? ' · ' : ''}{taskCount ? `${taskCount} tar` : ''}
                  {!dayEvents.length && !taskCount ? '—' : ''}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={[
                      'inline-flex items-center rounded-lg px-2 py-1 text-[11px] ring-1',
                      eventTypeBadgeClass(e.eventType),
                    ].join(' ')}
                  >
                    {eventTypeLabel(e.eventType)}
                  </span>
                ))}
                {dayEvents.length > 3 ? (
                  <span className="inline-flex items-center rounded-lg bg-white/5 px-2 py-1 text-[11px] text-zinc-200 ring-1 ring-white/10">
                    +{dayEvents.length - 3}
                  </span>
                ) : null}
                {taskCount ? (
                  <span className="inline-flex items-center rounded-lg bg-white/5 px-2 py-1 text-[11px] text-zinc-200 ring-1 ring-white/10">
                    T {taskCount}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {selectedDayKey ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedDayKey(null)
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Dia</div>
                <div className="mt-1 text-sm text-zinc-300">
                  {new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-10 rounded-xl bg-white/5 px-4 text-sm text-zinc-50 hover:bg-white/10"
                  onClick={enableNotifications}
                >
                  Notificações
                </button>
                <button
                  type="button"
                  className="h-10 rounded-xl bg-white/5 px-4 text-sm text-zinc-50 hover:bg-white/10"
                  onClick={() => setSelectedDayKey(null)}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={[
                  'h-10 rounded-xl px-4 text-sm ring-1',
                  activeTab === 'events'
                    ? 'bg-amber-300 text-zinc-950 ring-amber-300/40'
                    : 'bg-white/5 text-zinc-50 ring-white/10 hover:bg-white/10',
                ].join(' ')}
              >
                Eventos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={[
                  'h-10 rounded-xl px-4 text-sm ring-1',
                  activeTab === 'tasks'
                    ? 'bg-amber-300 text-zinc-950 ring-amber-300/40'
                    : 'bg-white/5 text-zinc-50 ring-white/10 hover:bg-white/10',
                ].join(' ')}
              >
                Tarefas
              </button>
            </div>

            {tasksError ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">
                {tasksError}
              </div>
            ) : null}

            {activeTab === 'events' ? (
              <div className="mt-5 grid gap-3">
                {selectedEvents.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    Nenhum evento neste dia.
                  </div>
                ) : (
                  selectedEvents.map((e) => {
                    const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
                      new Date(e.dateISO),
                    )
                    return (
                      <Link
                        key={e.id}
                        href={`/admin/events/${e.id}`}
                        className="rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-black/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  'inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1',
                                  eventTypeBadgeClass(e.eventType),
                                ].join(' ')}
                              >
                                {eventTypeLabel(e.eventType)}
                              </span>
                              <span className="text-sm text-zinc-300">{time}</span>
                            </div>
                            <div className="mt-2 font-medium text-zinc-50">{e.title}</div>
                            <div className="mt-1 text-sm text-zinc-300">
                              {e.clientName ? `${e.clientName} · ` : ''}
                              {e.locationName ?? ''}
                            </div>
                            <div className="mt-1 text-sm text-zinc-400">
                              Responsáveis: {e.musicians.length ? e.musicians.join(', ') : '—'}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-400">Abrir</div>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {tasksLoading ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    Carregando...
                  </div>
                ) : (
                  <div className="max-h-[70vh] overflow-auto rounded-xl border border-white/10 bg-black/20">
                    <div className="grid">
                      {slots.map((s) => {
                        const startAt = makeStartAtISO(selectedDayKey, s.hh, s.mm)
                        const t = tasksByStartAt.get(startAt)
                        const occupied = Boolean(t)
                        const dropActive = draggingTaskId != null && !occupied
                        return (
                          <div
                            key={`${s.hh}-${s.mm}`}
                            className={[
                              'grid grid-cols-[80px_1fr] gap-3 border-b border-white/10 p-3',
                              dropActive ? 'bg-white/5' : '',
                            ].join(' ')}
                            onDragOver={(e) => {
                              if (!dropActive) return
                              e.preventDefault()
                            }}
                            onDrop={(e) => {
                              if (!dropActive || !draggingTaskId) return
                              e.preventDefault()
                              moveTask(selectedDayKey, draggingTaskId, startAt)
                              setDraggingTaskId(null)
                            }}
                          >
                            <div className="text-xs text-zinc-400">{timeLabel(s.hh, s.mm)}</div>
                            {t ? (
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', t.id)
                                  setDraggingTaskId(t.id)
                                }}
                                onDragEnd={() => setDraggingTaskId(null)}
                                className="rounded-xl border border-white/10 bg-zinc-950/60 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <label className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={t.completed}
                                      onChange={() => toggleCompleted(selectedDayKey, t)}
                                      className="mt-1 h-4 w-4"
                                    />
                                    <div>
                                      <div className={['font-medium', t.completed ? 'line-through text-zinc-400' : 'text-zinc-50'].join(' ')}>
                                        {t.title}
                                      </div>
                                      {t.description ? <div className="mt-1 text-sm text-zinc-300">{t.description}</div> : null}
                                    </div>
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className={['inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1', taskColorClass(t.color)].join(' ')}>
                                      {t.color}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(t)}
                                      className="h-9 rounded-xl bg-white/5 px-3 text-sm text-zinc-50 hover:bg-white/10"
                                    >
                                      Editar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCreate(selectedDayKey, s.hh, s.mm)}
                                className="h-10 w-full rounded-xl bg-white/5 px-4 text-sm text-zinc-50 hover:bg-white/10"
                              >
                                Adicionar
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {editorOpen ? (
                  <div
                    className="fixed inset-0 z-[60] bg-black/60 p-4"
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget) setEditorOpen(false)
                    }}
                  >
                    <div className="fixed inset-x-4 top-4 mx-auto w-[calc(100%-2rem)] max-w-2xl">
                      <div className="max-h-[calc(100vh-2rem)] overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold">{editorMode === 'create' ? 'Nova tarefa' : 'Editar tarefa'}</div>
                          <button
                            type="button"
                            className="h-9 rounded-xl bg-white/5 px-3 text-sm text-zinc-50 hover:bg-white/10"
                            onClick={() => setEditorOpen(false)}
                          >
                            Fechar
                          </button>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <label className="grid gap-2">
                            <span className="text-sm text-zinc-200">Título</span>
                            <input
                              value={editorTitle}
                              onChange={(e) => setEditorTitle(e.target.value)}
                              className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm text-zinc-200">Descrição</span>
                            <input
                              value={editorDescription}
                              onChange={(e) => setEditorDescription(e.target.value)}
                              className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10"
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2">
                              <span className="text-sm text-zinc-200">Cor</span>
                              <select
                                value={editorColor}
                                onChange={(e) => setEditorColor(e.target.value)}
                                className="h-11 rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10"
                              >
                                <option value="blue">Azul</option>
                                <option value="green">Verde</option>
                                <option value="amber">Amarelo</option>
                                <option value="pink">Rosa</option>
                                <option value="purple">Roxo</option>
                                <option value="zinc">Neutro</option>
                              </select>
                            </label>
                            <div className="grid gap-2">
                              <span className="text-sm text-zinc-200">Horário</span>
                              <div className="flex h-11 items-center rounded-xl bg-black/30 px-4 text-zinc-50 ring-1 ring-white/10">
                                {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
                                  new Date(editorStartAt),
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                            <button
                              type="button"
                              onClick={() => saveEditor(selectedDayKey)}
                              className="h-11 rounded-xl bg-amber-300 px-5 text-sm font-medium text-zinc-950 hover:bg-amber-200"
                            >
                              Salvar
                            </button>
                            {editorMode === 'edit' && editorTaskId ? (
                              <button
                                type="button"
                                onClick={() => removeTask(selectedDayKey, editorTaskId)}
                                className="h-11 rounded-xl bg-white/5 px-5 text-sm font-medium text-zinc-50 hover:bg-white/10"
                              >
                                Excluir
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
