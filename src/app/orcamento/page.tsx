'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

function digitsFromAny(value: string) {
  const cleaned = value.replace(/\D/g, '')
  return cleaned.replace(/^0+(?=\d)/, '')
}

function formatBRLFromDigits(digits: string) {
  const onlyDigits = digits.replace(/\D/g, '')
  const cents = onlyDigits ? Number(onlyDigits) : 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function centsFromDigits(digits: string) {
  const onlyDigits = digits.replace(/\D/g, '')
  const cents = onlyDigits ? Number(onlyDigits) : 0
  return Number.isFinite(cents) ? cents : 0
}

const YOU_ARE_OPTIONS = [
  'Noiva/Noivo',
  'Assessoria',
  'Cerimonial',
  'Gerente',
  'Supervisor',
  'Proprietário',
  'Diretor',
  'Coordenador',
] as const

const EVENT_OPTIONS = [
  'Cerimônia de Casamento',
  'Cerimônia e Festa de Casamento',
  'Recepção',
  'Evento Corporativo',
  'Formatura',
  'Inauguração',
  'Jantar',
  'Cover Artístico',
  'Musical',
  'Cerimônia Fúnebre',
  'Gravação',
] as const

const INSTRUMENT_GROUPS: Array<{ title: string; items: string[] }> = [
  {
    title: 'Voz (Cantores)',
    items: [
      'Voz feminina popular',
      'Voz masculina popular',
      'Soprano',
      'Mezzo-soprano',
      'Contralto',
      'Tenor',
      'Barítono',
      'Baixo',
    ],
  },
  {
    title: 'Cordas',
    items: [
      'Violino',
      'Viola Clássica',
      'Violoncelo',
      'Contrabaixo Acústico',
      'Violão',
      'Guitarra',
      'Contrabaixo Elétrico',
      'Harpa',
    ],
  },
  {
    title: 'Sopros',
    items: [
      'Flauta',
      'Sax',
      'Trompete',
      'Clarim (Triunfal)',
      'Trompa',
      'Trombone',
      'Gaita',
      'Flauta Celta',
      'Oboé',
      'Fagote',
      'Clarinete',
      'Clarone',
      'Tuba',
    ],
  },
  {
    title: 'Percussão',
    items: ['Bateria', 'Tímpanos', 'Percussão sinfônica', 'Cajon'],
  },
  {
    title: 'Teclas',
    items: [
      'Piano digital (ou teclado)',
      'Piano cenográfico (branco ou preto)',
      'Piano de cauda (sujeito a análise técnica do espaço)',
      'Acordeom (sanfona)',
      'Órgão eletrônico',
    ],
  },
]

function toggleInArray(list: string[], value: string) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

export default function OrcamentoPage() {
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [youAre, setYouAre] = useState<string[]>([])
  const [youAreOther, setYouAreOther] = useState('')
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [eventOther, setEventOther] = useState('')
  const [coupleName, setCoupleName] = useState('')
  const [eventDateTimeCity, setEventDateTimeCity] = useState('')
  const [expectations, setExpectations] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedInstruments, setSelectedInstruments] = useState<Record<string, { selected: boolean; qty: number }>>({})

  const [budgetDigits, setBudgetDigits] = useState('')
  const [discountPctRaw, setDiscountPctRaw] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const instruments = useMemo(() => {
    const list: Array<{ name: string; qty: number }> = []
    for (const [name, v] of Object.entries(selectedInstruments)) {
      if (!v?.selected) continue
      const qty = Number.isFinite(v.qty) ? Math.max(1, Math.min(50, Math.floor(v.qty))) : 1
      list.push({ name, qty })
    }
    list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [selectedInstruments])

  const budgetValueCents = useMemo(() => centsFromDigits(budgetDigits), [budgetDigits])
  const discountPct = useMemo(() => {
    const n = Number(String(discountPctRaw).replace(',', '.'))
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, n))
  }, [discountPctRaw])

  const discountCents = useMemo(() => Math.round((budgetValueCents * discountPct) / 100), [budgetValueCents, discountPct])
  const finalCents = useMemo(() => Math.max(0, budgetValueCents - discountCents), [budgetValueCents, discountCents])

  const formationText = useMemo(() => {
    if (instruments.length === 0) return 'A definir (vamos orientar a melhor escolha)'
    return instruments.map((i) => `${i.name} x${i.qty}`).join(', ')
  }, [instruments])

  const whatsAppUrl = useMemo(() => {
    const parts = [
      `Pedido de orçamento — Essência Musical`,
      ``,
      `Nome: ${fullName.trim() || '—'}`,
      `Empresa: ${company.trim() || '—'}`,
      `Você é: ${(youAreOther.trim() ? [...youAre, youAreOther.trim()] : youAre).join(', ') || '—'}`,
      `Evento: ${(eventOther.trim() ? [...eventTypes, eventOther.trim()] : eventTypes).join(', ') || '—'}`,
      `Casal: ${coupleName.trim() || '—'}`,
      `Data/hora/cidade: ${eventDateTimeCity.trim() || '—'}`,
      ``,
      `Expectativa: ${expectations.trim() || '—'}`,
      ``,
      `Formação: ${formationText}`,
      ``,
      `Contato: ${phone.trim() || '—'} · ${email.trim() || '—'}`,
    ]
    const text = parts.join('\n')
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }, [fullName, company, youAre, youAreOther, eventTypes, eventOther, coupleName, eventDateTimeCity, expectations, phone, email, formationText])

  async function generatePdf() {
    setError(null)
    setSuccess(null)

    const youAreFinal = youAreOther.trim() ? Array.from(new Set([...youAre, youAreOther.trim()])) : youAre
    const eventFinal = eventOther.trim() ? Array.from(new Set([...eventTypes, eventOther.trim()])) : eventTypes

    if (fullName.trim().length < 2) return setError('Preencha seu nome completo.')
    if (!youAreFinal.length) return setError('Selecione pelo menos uma opção em “Você é”.')
    if (!eventFinal.length) return setError('Selecione pelo menos uma opção em “Evento”.')
    if (eventDateTimeCity.trim().length < 3) return setError('Preencha data, hora e cidade do evento.')
    if (expectations.trim().length < 10) return setError('Conte um pouco sobre o que espera da parte musical.')
    if (phone.trim().length < 6) return setError('Preencha seu telefone/WhatsApp.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Preencha um email válido.')

    const payload = {
      fullName: fullName.trim(),
      company: company.trim() || null,
      youAre,
      youAreOther: youAreOther.trim() || null,
      eventTypes,
      eventOther: eventOther.trim() || null,
      coupleName: coupleName.trim() || null,
      eventDateTimeCity: eventDateTimeCity.trim(),
      expectations: expectations.trim(),
      phone: phone.trim(),
      email: email.trim(),
      instruments,
      budgetValueCents,
      discountPct,
      notes: notes.trim() || null,
    }

    setSubmitting(true)
    try {
      const r = await fetch('/api/budget/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        setError('Não foi possível gerar o PDF. Verifique os campos.')
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setSuccess('PDF gerado com sucesso.')
    } catch {
      setError('Não foi possível gerar o PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/essencia-logo.svg" alt="Essência Musical" className="h-9 w-auto" />
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 hover:text-white" href="/">
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Pedido de orçamento</h1>
        <p className="mt-2 text-sm text-zinc-300">
          O restante do formulário é obrigatório. A seleção de instrumentos é opcional: se preferir, vá direto para o WhatsApp e nós ajudamos a definir a melhor formação.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-100">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-100">{success}</div>
        ) : null}

        <div className="mt-8 grid gap-8">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Dados</h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Nome completo</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Empresa (se aplicável)</span>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Você é</h2>
            <div className="mt-4 grid gap-2">
              {YOU_ARE_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-3 ring-1 ring-white/10">
                  <input type="checkbox" checked={youAre.includes(opt)} onChange={() => setYouAre((prev) => toggleInArray(prev, opt))} />
                  <span className="text-sm text-zinc-100">{opt}</span>
                </label>
              ))}
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Outro (se quiser especificar)</span>
                <input
                  value={youAreOther}
                  onChange={(e) => setYouAreOther(e.target.value)}
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                  placeholder="Ex.: Gerente comercial"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Evento</h2>
            <div className="mt-4 grid gap-2">
              {EVENT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-3 ring-1 ring-white/10">
                  <input type="checkbox" checked={eventTypes.includes(opt)} onChange={() => setEventTypes((prev) => toggleInArray(prev, opt))} />
                  <span className="text-sm text-zinc-100">{opt}</span>
                </label>
              ))}
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Outro (se quiser especificar)</span>
                <input
                  value={eventOther}
                  onChange={(e) => setEventOther(e.target.value)}
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                  placeholder="Ex.: Evento social"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Detalhes do evento</h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Nome do casal (se aplicável)</span>
                <input
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Data, hora, cidade do evento</span>
                <input
                  value={eventDateTimeCity}
                  onChange={(e) => setEventDateTimeCity(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                  placeholder="Ex.: 15/09/2026 às 16:30 — Curitiba/PR"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Fale um pouco sobre o que espera da parte musical</span>
                <textarea
                  value={expectations}
                  onChange={(e) => setExpectations(e.target.value)}
                  required
                  rows={5}
                  className="rounded-xl bg-black/40 px-4 py-3 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Contato</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Telefone / WhatsApp</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Opções de instrumentos (opcional)</h2>
              <a href={whatsAppUrl} target="_blank" rel="noreferrer" className="text-sm text-amber-200/90 hover:text-amber-200">
                Não sei o que escolher → WhatsApp
              </a>
            </div>
            <p className="mt-2 text-sm text-zinc-300">
              Selecione os instrumentos e informe a quantidade desejada (ex.: Violino x2). Se não souber, pode pular esta etapa.
            </p>

            <div className="mt-4 grid gap-6">
              {INSTRUMENT_GROUPS.map((g) => (
                <div key={g.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="font-medium">{g.title}</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {g.items.map((name) => {
                      const current = selectedInstruments[name] ?? { selected: false, qty: 1 }
                      return (
                        <div key={name} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-4 py-3 ring-1 ring-white/10">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={current.selected}
                              onChange={() =>
                                setSelectedInstruments((prev) => ({
                                  ...prev,
                                  [name]: { selected: !current.selected, qty: current.qty || 1 },
                                }))
                              }
                            />
                            <span className="text-sm text-zinc-100">{name}</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={current.qty}
                            disabled={!current.selected}
                            onChange={(e) => {
                              const qty = Math.max(1, Math.min(50, Math.floor(Number(e.target.value) || 1)))
                              setSelectedInstruments((prev) => ({
                                ...prev,
                                [name]: { selected: true, qty },
                              }))
                            }}
                            className="h-10 w-20 rounded-xl bg-black/40 px-3 text-sm text-zinc-50 outline-none ring-1 ring-white/10 disabled:opacity-50"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Uso interno</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Campos para finalizar o orçamento. Se quiser, preencha os valores e gere o PDF pronto com layout profissional.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Valor do orçamento</span>
                <input
                  inputMode="numeric"
                  value={formatBRLFromDigits(budgetDigits)}
                  onChange={(e) => setBudgetDigits(digitsFromAny(e.target.value))}
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-200">Percentual de desconto (%)</span>
                <input
                  inputMode="decimal"
                  value={discountPctRaw}
                  onChange={(e) => setDiscountPctRaw(e.target.value)}
                  className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                  placeholder="0"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="grid gap-2 text-sm text-zinc-200">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Valor original</span>
                  <span className="font-medium">{formatBRLFromDigits(budgetDigits)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Desconto aplicado</span>
                  <span className="font-medium">
                    {discountPct}% ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountCents / 100)})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Valor final</span>
                  <span className="text-lg font-semibold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalCents / 100)}
                  </span>
                </div>
              </div>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-sm text-zinc-200">Anotações para o sistema (opcional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="rounded-xl bg-black/40 px-4 py-3 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              />
            </label>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-medium hover:bg-white/10"
              >
                Enviar para WhatsApp
              </a>
              <button
                type="button"
                onClick={generatePdf}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200 disabled:opacity-60"
              >
                {submitting ? 'Gerando...' : 'Gerar PDF do orçamento'}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
