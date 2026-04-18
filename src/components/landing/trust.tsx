import { Reveal } from "@/components/landing/reveal";

const ITEMS = [
  { title: "Direcao artistica", text: "Curadoria de repertorio e identidade sonora coerente com o estilo do casal." },
  { title: "Arranjos sob medida", text: "Adaptacao perfeita para a formacao escolhida, com harmonia e impacto emocional." },
  { title: "Producao e sonorizacao", text: "Operacao tecnica para clareza, equilibrio e seguranca do audio no evento." },
  { title: "Equipe profissional", text: "Músicos selecionados, pontualidade e postura alinhada a eventos de alto padrao." },
];

export function TrustSection() {
  return (
    <section className="border-t border-amber-300/30 bg-[#f4f4f4]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-18">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 90}>
              <div className="rounded-2xl border border-amber-300/35 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="font-display text-xl text-amber-700">{item.title}</div>
                <div className="mt-3 text-sm leading-7 text-zinc-700">{item.text}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
