import { Reveal } from "@/components/landing/reveal";

const SERVICES = [
  {
    title: "Cerimonia",
    text: "Entrada dos noivos, cortejo, votos e ritos com curadoria musical sensivel e arranjos sob medida para cada instante.",
  },
  {
    title: "Recepcao",
    text: "Ambientacao refinada para jantar e coquetel, criando um clima sofisticado, acolhedor e memoravel para convidados.",
  },
  {
    title: "Show Principal",
    text: "Performance de alto impacto com banda completa, repertorio estrategico e direcao artistica para emocionar e celebrar.",
  },
];

export function ServicesSection() {
  return (
    <section id="servicos" className="border-t border-amber-200/10 bg-[#0d0d0d]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <div className="mb-10 sm:mb-14">
            <p className="text-xs tracking-[0.22em] text-amber-200/70">SERVICOS EXCLUSIVOS</p>
            <h2 className="mt-3 font-display text-3xl text-zinc-50 sm:text-4xl">Cada momento com sonoridade perfeita</h2>
          </div>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-3">
          {SERVICES.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 120}>
              <article className="group rounded-2xl border border-amber-200/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7 shadow-[0_14px_40px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-amber-200/40">
                <h3 className="font-display text-2xl text-amber-100">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-300">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

