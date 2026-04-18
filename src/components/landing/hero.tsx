import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

export function LuxuryHero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 pb-14 sm:pt-20 sm:pb-20">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <Reveal>
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/20 bg-white/5 px-4 py-2 text-[11px] tracking-[0.22em] text-amber-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-200/80" />
              <span>ESSÊNCIA MUSICAL · DESDE 2014</span>
            </div>
            <h1 className="font-display text-4xl leading-tight text-zinc-50 sm:text-5xl lg:text-6xl">
              A trilha sonora do amor de vocês.
            </h1>
            <p className="max-w-xl text-base leading-8 text-zinc-300 sm:text-lg">
              Música ao vivo de altíssimo padrão para cerimônias de casamento, recepções e eventos exclusivos. Formações sob medida,
              repertório personalizado e uma experiência inesquecível.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-zinc-200">
              <div className="rounded-xl border border-amber-200/15 bg-white/5 px-4 py-3">
                <div className="font-display text-lg text-amber-100">+ 800</div>
                <div className="text-xs text-zinc-300">cerimônias</div>
              </div>
              <div className="rounded-xl border border-amber-200/15 bg-white/5 px-4 py-3">
                <div className="font-display text-lg text-amber-100">Campinas</div>
                <div className="text-xs text-zinc-300">SP e região</div>
              </div>
              <div className="rounded-xl border border-amber-200/15 bg-white/5 px-4 py-3">
                <div className="font-display text-lg text-amber-100">Luxo</div>
                <div className="text-xs text-zinc-300">alto padrão</div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="#contato"
                className="gold-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 font-semibold text-zinc-950 transition hover:scale-[1.02] hover:brightness-110"
              >
                Solicite seu orçamento
              </Link>
              <a
                href="#servicos"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-amber-200/30 bg-white/5 px-6 text-zinc-100 transition hover:scale-[1.02] hover:border-amber-200/60 hover:bg-white/10"
              >
                Nossos serviços
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
              <p className="font-display text-2xl text-amber-100 sm:text-3xl">A trilha sonora do seu grande dia</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
