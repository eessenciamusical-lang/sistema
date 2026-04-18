import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

export function LuxuryHero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 pb-18 sm:pt-20 sm:pb-24">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <Reveal>
          <div className="flex flex-col gap-6">
            <div className="text-[11px] tracking-[0.28em] text-amber-200/80">SISTEMA SEVEN · ESSENCIA MUSICAL</div>
            <h1 className="font-display text-4xl leading-tight text-zinc-50 sm:text-5xl lg:text-6xl">
              A Trilha Sonora do Seu Grande Dia
            </h1>
            <p className="max-w-xl text-base leading-8 text-zinc-300 sm:text-lg">
              Experiencias musicais exclusivas para casamentos sofisticados: planejamento artistico, formacao impecavel e execucao elegante do inicio ao ultimo aplauso.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/orcamento"
                className="gold-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 font-semibold text-zinc-950 transition hover:scale-[1.02] hover:brightness-110"
              >
                Solicitar Proposta
              </Link>
              <a
                href="#servicos"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-amber-200/30 bg-white/5 px-6 text-zinc-100 transition hover:scale-[1.02] hover:border-amber-200/60 hover:bg-white/10"
              >
                Conhecer Servicos
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="relative overflow-hidden rounded-3xl border border-amber-200/20 bg-zinc-900 shadow-[0_25px_90px_rgba(0,0,0,0.45)]">
            <Image
              src="https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1600&q=80"
              alt="Banda de casamento ao vivo com iluminacao cenica"
              width={1600}
              height={1066}
              className="h-[420px] w-full object-cover sm:h-[520px]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
            <div className="absolute bottom-0 p-6 sm:p-8">
              <p className="font-display text-2xl text-amber-100 sm:text-3xl">Elegancia sonora para momentos inesqueciveis</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

