import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrcamentoPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {}
  const ok = sp.ok === '1'

  async function submitAction(formData: FormData) {
    'use server'

    const parsed = z
      .object({
        name: z.string().min(2),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().min(6).optional().or(z.literal('')),
        message: z.string().min(10),
      })
      .safeParse({
        name: String(formData.get('name') ?? '').trim(),
        email: String(formData.get('email') ?? '').trim(),
        phone: String(formData.get('phone') ?? '').trim(),
        message: String(formData.get('message') ?? '').trim(),
      })

    if (!parsed.success) redirect('/orcamento?ok=0')

    await prisma.lead.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
      },
    })

    redirect('/orcamento?ok=1')
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
        <h1 className="text-3xl font-semibold tracking-tight">Solicitar orçamento</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Conte um pouco sobre o seu evento. Entramos em contato com uma proposta de formação e valores.
        </p>

        {ok ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-100">
            Recebemos sua solicitação. Em breve entraremos em contato.
          </div>
        ) : null}

        <form action={submitAction} className="mt-8 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Nome</span>
            <input
              name="name"
              required
              className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="Seu nome"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">Email (opcional)</span>
              <input
                name="email"
                type="email"
                className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                placeholder="voce@exemplo.com"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-200">WhatsApp (opcional)</span>
              <input
                name="phone"
                className="h-11 rounded-xl bg-black/40 px-4 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
                placeholder="(00) 00000-0000"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-200">Mensagem</span>
            <textarea
              name="message"
              required
              rows={6}
              className="rounded-xl bg-black/40 px-4 py-3 text-zinc-50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-300/40"
              placeholder="Data do casamento, cidade, local, formação desejada, momentos e repertório..."
            />
          </label>

          <button
            type="submit"
            className="mt-2 h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
          >
            Enviar
          </button>
        </form>
      </main>
    </div>
  )
}
