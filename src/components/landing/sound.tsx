import { Reveal } from "@/components/landing/reveal";

export function SoundSection() {
  return (
    <section id="sonorizacao" className="border-t border-amber-200/10 bg-[#0d0d0d]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <p className="text-xs tracking-[0.22em] text-amber-200/70">SONORIZACAO</p>
          <h2 className="mt-3 font-display text-3xl text-zinc-50 sm:text-4xl">Clareza, equilibrio e seguranca em todo o evento</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            Nosso som nao e apenas volume: e inteligibilidade. A estrutura e dimensionada para o espaco, com mesa profissional,
            microfones adequados para musicos e celebrante e retornos para uma execucao precisa.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Reveal>
            <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7">
              <div className="font-display text-2xl text-amber-100">Operacao tecnica</div>
              <p className="mt-4 text-sm leading-7 text-zinc-300">
                Um tecnico de som e um auxiliar acompanham o evento inteiro, com ajustes em tempo real e atuacao imediata em qualquer eventualidade.
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={120}>
            <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7">
              <div className="font-display text-2xl text-amber-100">Captação profissional</div>
              <p className="mt-4 text-sm leading-7 text-zinc-300">
                Saida de audio direta da mesa para foto e video, facilitando uma captacao limpa e consistente do que realmente aconteceu ao vivo.
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={240}>
            <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7">
              <div className="font-display text-2xl text-amber-100">Elegancia sonora</div>
              <p className="mt-4 text-sm leading-7 text-zinc-300">
                Sonorizacao pensada para recepcoes e momentos sociais: ambiente sofisticado, sem descaracterizar a cerimonia e sem excesso.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

