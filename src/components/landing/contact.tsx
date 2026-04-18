"use client";

import { useMemo, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function ContactSection() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | "ok" | "error">(null);
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", message: "" });

  const canSubmit = useMemo(() => {
    return form.name.trim().length >= 2 && form.email.includes("@") && form.message.trim().length >= 10 && !loading;
  }, [form, loading]);

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setDone(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("request");
      setDone("ok");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setDone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contato" className="border-t border-amber-300/30 bg-[#f5f5f5]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[1fr_480px] lg:items-start">
          <div>
            <p className="text-xs tracking-[0.22em] text-amber-700">SOLICITE SEU ORCAMENTO</p>
            <h2 className="mt-3 font-display text-3xl text-zinc-900 sm:text-4xl">Vamos compor a noite de vocês</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-700 sm:text-base">
              Preencha o formulário e nossa equipe entra em contato em até 24 horas úteis com uma proposta personalizada para sua
              música ao vivo para casamento.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-300/35 bg-white p-5 text-sm text-zinc-700">
                Atendimento personalizado por consultor
              </div>
              <div className="rounded-2xl border border-amber-300/35 bg-white p-5 text-sm text-zinc-700">
                Curadoria de repertório inclusa
              </div>
              <div className="rounded-2xl border border-amber-300/35 bg-white p-5 text-sm text-zinc-700">
                Formações flexíveis · do solo à orquestra
              </div>
              <div className="rounded-2xl border border-amber-300/35 bg-white p-5 text-sm text-zinc-700">
                Equipe própria de sonorização
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-300/35 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.12)] sm:p-8">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-700">Nome</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-11 rounded-xl bg-zinc-100 px-4 text-zinc-900 outline-none ring-1 ring-amber-300/20 focus:ring-2 focus:ring-amber-400/45"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-700">Email</span>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="h-11 rounded-xl bg-zinc-100 px-4 text-zinc-900 outline-none ring-1 ring-amber-300/20 focus:ring-2 focus:ring-amber-400/45"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-700">WhatsApp (opcional)</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-11 rounded-xl bg-zinc-100 px-4 text-zinc-900 outline-none ring-1 ring-amber-300/20 focus:ring-2 focus:ring-amber-400/45"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-zinc-700">Mensagem</span>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  rows={5}
                  className="rounded-xl bg-zinc-100 px-4 py-3 text-zinc-900 outline-none ring-1 ring-amber-300/20 focus:ring-2 focus:ring-amber-400/45"
                />
              </label>

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="gold-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 font-semibold text-zinc-950 transition enabled:hover:scale-[1.02] enabled:hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar"}
              </button>

              {done === "ok" ? <div className="text-sm text-amber-700">Recebido! Vamos retornar em breve.</div> : null}
              {done === "error" ? (
                <div className="text-sm text-amber-700">
                  Não foi possível enviar agora. Você pode usar o formulário de Orçamento.
                </div>
              ) : null}

              <a
                href="/orcamento"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-50 px-6 text-sm text-zinc-800 transition hover:bg-amber-100"
              >
                Abrir formulário completo de orçamento
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
