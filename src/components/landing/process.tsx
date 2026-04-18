import { Reveal } from "@/components/landing/reveal";

const STEPS = [
  {
    title: "Briefing do casal",
    text: "Entendemos estilo, local, horario e as musicas que tem significado. Aqui nasce o direcionamento da trilha sonora do casamento.",
  },
  {
    title: "Formacao ideal",
    text: "Indicamos combinacoes de voz e instrumentos que valorizam o ambiente e o tamanho do evento, com elegancia e presenca.",
  },
  {
    title: "Arranjos e repertorio",
    text: "Organizamos o repertorio por momentos (entrada, votos, aliancas, saida, jantar, festa) e adaptamos tudo para a formacao escolhida.",
  },
  {
    title: "Producao e operacao",
    text: "Alinhamos horarios, passagem de som, microfones e operacao tecnica para o evento fluir com nitidez e zero improviso.",
  },
];

export function ProcessSection() {
  return (
    <section id="processo" className="border-t border-amber-200/10 bg-[#0d0d0d]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <p className="text-xs tracking-[0.22em] text-amber-200/70">COMO FUNCIONA</p>
          <h2 className="mt-3 font-display text-3xl text-zinc-50 sm:text-4xl">Uma jornada organizada, do planejamento ao palco</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            Para uma musica ao vivo impecavel, a excelencia esta no processo. Do primeiro contato ate o grande dia, cada etapa
            existe para garantir pontualidade, emocao e qualidade musical em cada detalhe.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delayMs={i * 120}>
              <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7">
                <div className="flex items-start gap-4">
                  <div className="gold-gradient flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-zinc-950">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="font-display text-2xl text-amber-100">{s.title}</div>
                    <div className="mt-3 text-sm leading-7 text-zinc-300">{s.text}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

