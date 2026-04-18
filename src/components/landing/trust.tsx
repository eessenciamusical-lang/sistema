import { Reveal } from "@/components/landing/reveal";

const ITEMS = [
  { title: "Direcao artistica", text: "Curadoria de repertorio e identidade sonora coerente com o estilo do casal." },
  { title: "Arranjos sob medida", text: "Adaptacao perfeita para a formacao escolhida, com harmonia e impacto emocional." },
  { title: "Producao e sonorizacao", text: "Operacao tecnica para clareza, equilibrio e seguranca do audio no evento." },
  { title: "Equipe profissional", text: "Músicos selecionados, pontualidade e postura alinhada a eventos de alto padrao." },
];

export function TrustSection() {
  return (
    <section className="border-t border-amber-200/10">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-18">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 90}>
              <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6">
                <div className="font-display text-xl text-amber-100">{item.title}</div>
                <div className="mt-3 text-sm leading-7 text-zinc-300">{item.text}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

