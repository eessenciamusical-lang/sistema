import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

export function FinalCtaSection() {
  return (
    <section className="border-t border-amber-300/30 bg-[#ededed]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <div className="rounded-3xl border border-amber-300/35 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.12)] sm:p-12">
            <p className="text-xs tracking-[0.22em] text-amber-700">PRONTO PARA O SEU EVENTO</p>
            <h2 className="mt-3 font-display text-3xl text-zinc-900 sm:text-4xl">Transforme seu casamento em uma experiencia sonora inesquecivel</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700 sm:text-base">
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
                className="inline-flex h-12 items-center justify-center rounded-xl border border-amber-300/50 bg-amber-50 px-7 text-zinc-800 transition hover:scale-[1.02] hover:border-amber-500/70 hover:bg-amber-100"
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
