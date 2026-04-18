import { Reveal } from "@/components/landing/reveal";

const FAQ = [
  {
    q: "Vocês fazem musica ao vivo apenas para cerimonia?",
    a: "Sim. Montamos formacoes sob medida para cerimonia, recepcao e tambem para o show principal. A proposta se adapta ao estilo do evento e ao local.",
  },
  {
    q: "Como escolhemos as musicas do casamento?",
    a: "Voce pode indicar musicas essenciais e referencias. Organizamos por momentos (entrada, votos, aliancas, saida, jantar, festa) e sugerimos opcoes alinhadas ao seu perfil.",
  },
  {
    q: "E se algum musico tiver imprevisto?",
    a: "Trabalhamos com equipe selecionada e previsao de substitutos preparados, preservando a formacao contratada e o nivel tecnico do evento.",
  },
  {
    q: "A sonorizacao esta inclusa?",
    a: "Podemos incluir a estrutura completa conforme necessidade: caixas dimensionadas para o espaco, mesa profissional, microfones e operacao tecnica durante todo o evento.",
  },
  {
    q: "Vocês atendem outras cidades?",
    a: "Atendemos sob consulta, considerando logistica e viabilidade tecnica do espaco. Informe cidade, data e local para avaliarmos a melhor proposta.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-amber-300/30 bg-[#efefef]">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <p className="text-xs tracking-[0.22em] text-amber-700">PERGUNTAS FREQUENTES</p>
          <h2 className="mt-3 font-display text-3xl text-zinc-900 sm:text-4xl">Tudo o que vocês precisam saber</h2>
        </Reveal>

        <div className="mt-10 grid gap-4">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delayMs={i * 80}>
              <details className="group rounded-2xl border border-amber-300/35 bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.07)] open:bg-amber-50/50">
                <summary className="cursor-pointer list-none select-none">
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-display text-xl text-amber-700">{f.q}</div>
                    <div className="mt-1 text-amber-700/70 transition group-open:rotate-45">+</div>
                  </div>
                </summary>
                <div className="mt-4 text-sm leading-7 text-zinc-700">{f.a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
