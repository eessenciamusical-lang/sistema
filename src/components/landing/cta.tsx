import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

export function FinalCtaSection() {
  return (
    <section className="border-t border-amber-200/10 bg-[#0d0d0d]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <div className="rounded-3xl border border-amber-200/20 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-12">
            <p className="text-xs tracking-[0.22em] text-amber-200/70">PRONTO PARA O SEU EVENTO</p>
            <h2 className="mt-3 font-display text-3xl text-zinc-50 sm:text-4xl">Transforme seu casamento em uma experiencia sonora inesquecivel</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Receba uma proposta personalizada com formacao ideal, planejamento musical e acompanhamento profissional para o seu grande dia.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/orcamento"
                className="gold-gradient inline-flex h-12 items-center justify-center rounded-xl px-7 font-semibold text-zinc-950 transition hover:scale-[1.02] hover:brightness-110"
              >
                Solicitar Orcamento
              </Link>
              <a
                href="#topo"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-amber-200/35 bg-white/5 px-7 text-zinc-100 transition hover:scale-[1.02] hover:border-amber-200/60 hover:bg-white/10"
              >
                Voltar ao Topo
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

