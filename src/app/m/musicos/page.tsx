/* Client component to subscribe SSE and show notifications */
'use client'
import { useEffect, useRef, useState } from 'react'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'

type Notif = { id: string; client: string; eventTitle: string; date: string; value: number }

export default function MusicianAlertsPage() {
  const [queue, setQueue] = useState<Notif[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/musicians/stream')
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data?.type === 'assignment') {
          setQueue((q) => [...q, { id: data.id, client: data.client, eventTitle: data.eventTitle, date: data.date, value: data.value }])
          audioRef.current?.play().catch(() => {})
        }
      } catch {}
    }
    return () => es.close()
  }, [])

  async function ack(id: string) {
    await fetch('/api/musicians/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignmentId: id }) })
    setQueue((q) => q.filter((n) => n.id !== id))
  }

  return (
    <div className="grid gap-6">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
        <p className="mt-1 text-sm text-zinc-300">Alertas em tempo real para novos eventos atribuídos.</p>
        <div className="mt-2 text-xs text-zinc-400">{connected ? 'Conectado' : 'Reconectando...'}</div>
      </div>
      <div className="fixed inset-x-0 top-20 z-20 mx-auto flex max-w-xl flex-col gap-3 px-4">
        {queue.map((n) => (
          <div key={n.id} className="animate-[fade-in_150ms_ease-out] rounded-2xl border border-amber-300/40 bg-amber-300/20 p-4 shadow-xl backdrop-blur">
            <div className="text-sm text-amber-200">Novo contrato atribuído</div>
            <div className="mt-1 font-medium text-zinc-50">{n.eventTitle}</div>
            <div className="mt-1 text-sm text-zinc-200">{n.client} · {formatDateBR(new Date(n.date))} · {formatCurrencyBRL(n.value)}</div>
            <div className="mt-3">
              <button onClick={() => ack(n.id)} className="h-9 rounded-xl bg-amber-300 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-200">
                Marcar como lido
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
        Deixe esta página aberta em segundo plano para receber alertas sonoros e visuais.
      </div>
    </div>
  )
}

