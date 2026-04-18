import { Reveal } from "@/components/landing/reveal";

const SERVICES = [
  {
    title: "Cerimonia",
    text: "Quarteto de cordas, trios e solistas conduzindo cada momento da entrada à saída dos noivos, com emoção e precisão.",
  },
  {
    title: "Recepcao",
    text: "Voz, piano, sax e bandas completas para coquetel, jantar e pista de dança, mantendo a elegância do começo ao fim.",
  },
  {
    title: "Repertorio sob medida",
    text: "Curadoria personalizada com clássicos e populares, além de arranjos exclusivos alinhados ao estilo do casal.",
  },
  {
    title: "Eventos corporativos",
    text: "Música ao vivo para inaugurações, jantares de gala, restaurantes e eventos privados com excelência e discrição.",
  },
];

export function ServicesSection() {
  return (
    <section id="servicos" className="border-t border-amber-200/10 bg-[#0d0d0d]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <div className="mb-10 sm:mb-14">
            <p className="text-xs tracking-[0.22em] text-amber-200/70">NOSSOS SERVICOS</p>
            <h2 className="mt-3 font-display text-3xl text-zinc-50 sm:text-4xl">Música ao vivo para momentos eternos</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Cada formação é desenhada para emocionar. Da delicadeza de um solo de violino à imponência de uma banda completa,
              conduzimos cada nota com elegância.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
