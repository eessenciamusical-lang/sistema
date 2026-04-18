import { Reveal } from "@/components/landing/reveal";

const MOMENTS = [
  {
    title: "Cerimonia de casamento",
    items: ["Entrada da noiva e cortejo", "Votos e aliancas", "Assinaturas e ritos", "Saida do casal"],
  },
  {
    title: "Recepcao e jantar",
    items: ["Musica ambiente elegante", "Trilhas para discursos e brindes", "Primeira danca e momentos especiais"],
  },
  {
    title: "Show e celebracao",
    items: ["Pop sofisticado e classicos", "Soul, jazz e romanticas", "Set principal com energia na medida"],
  },
];

const STYLES = [
  "Musica ao vivo para casamento com voz e instrumentos",
  "Quarteto de cordas, piano, harpa e sopros",
  "Banda completa com metais e percussao",
  "Repertorio internacional e nacional, conforme perfil do casal",
];

export function RepertoireSection() {
  return (
    <section id="repertorio" className="border-t border-amber-300/30 bg-[#efefef]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <p className="text-xs tracking-[0.22em] text-amber-700">REPERTORIO</p>
          <h2 className="mt-3 font-display text-3xl text-zinc-900 sm:text-4xl">Repertorio com intencao, nao apenas musicas</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700 sm:text-base">
            Uma banda para casamento de alto padrao precisa mais do que tocar bem: precisa entender ritmo do evento, emocao e
            atmosfera. Aqui, organizamos a musica ao vivo por momentos e criamos uma trilha sonora coesa, elegante e memoravel.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {MOMENTS.map((m, i) => (
            <Reveal key={m.title} delayMs={i * 120}>
              <div className="rounded-2xl border border-amber-300/35 bg-white p-7 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="font-display text-2xl text-amber-700">{m.title}</div>
                <ul className="mt-4 grid gap-2 text-sm text-zinc-700">
                  {m.items.map((it) => (
                    <li key={it} className="flex gap-3">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-amber-200/70" />
                      <span className="leading-7">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={180}>
          <div className="mt-10 rounded-3xl border border-amber-300/35 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <div className="font-display text-2xl text-zinc-900">Estilos e formacoes mais procurados</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {STYLES.map((t) => (
                <div key={t} className="rounded-2xl border border-amber-300/30 bg-amber-50/50 p-5 text-sm text-zinc-700">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
