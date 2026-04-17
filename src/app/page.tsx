import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/essencia-logo.svg" alt="Essência Musical" width={180} height={36} className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <a className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="#portfolio">
              Portfólio
            </a>
            <a className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="#depoimentos">
              Depoimentos
            </a>
            <Link className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white" href="/orcamento">
              Orçamento
            </Link>
            <Link className="rounded-lg bg-amber-300 px-3 py-2 font-medium text-zinc-950 hover:bg-amber-200" href="/login">
              Área interna
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="flex flex-col gap-6">
              <div className="text-xs tracking-[0.25em] text-amber-200/80">AGÊNCIA DE MÚSICOS PARA CASAMENTOS</div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Música ao vivo com produção impecável do planejamento ao grande dia
              </h1>
              <p className="text-base leading-7 text-zinc-300 sm:text-lg">
                Um time selecionado de músicos e um processo profissional para garantir pontualidade, repertório certo e
                experiência memorável.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/orcamento"
                  className="h-11 rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200 inline-flex items-center justify-center"
                >
                  Pedir orçamento
                </Link>
                <a
                  href="#portfolio"
                  className="h-11 rounded-xl bg-white/5 px-5 font-medium text-zinc-50 hover:bg-white/10 inline-flex items-center justify-center"
                >
                  Ver portfólio
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-zinc-200 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-amber-200/90">Planejamento</div>
                  <div className="mt-1 text-zinc-300">Cronograma e alinhamento</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-amber-200/90">Repertório</div>
                  <div className="mt-1 text-zinc-300">Personalizado por momento</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-amber-200/90">Equipe</div>
                  <div className="mt-1 text-zinc-300">Músicos escalados e confirmados</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6">
              <div className="rounded-2xl bg-black/30 p-6">
                <div className="text-sm text-zinc-300">O que entregamos</div>
                <ul className="mt-4 flex flex-col gap-3 text-sm">
                  <li className="rounded-xl bg-white/5 p-4">Equipe sob medida para cerimônia e recepção</li>
                  <li className="rounded-xl bg-white/5 p-4">Checklist do evento, mapa e horários de chegada</li>
                  <li className="rounded-xl bg-white/5 p-4">Gestão de contratos, pagamentos e escala</li>
                  <li className="rounded-xl bg-white/5 p-4">Portal mobile para o músico (agenda, detalhes e cachê)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="portfolio" className="border-t border-white/10 bg-black/20">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">Portfólio</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">
              Espaço para vídeos, fotos e repertórios que convertem. Troque os cards por embeds reais quando quiser.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-amber-200/90">Cerimônia</div>
                <div className="mt-2 text-sm text-zinc-300">Entrada, votos, alianças e saída.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-amber-200/90">Recepção</div>
                <div className="mt-2 text-sm text-zinc-300">Jantar, pista e momentos especiais.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-amber-200/90">Formações</div>
                <div className="mt-2 text-sm text-zinc-300">Voz, violão, piano, violino e banda.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="depoimentos" className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">Depoimentos</h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-200">
                “Pontualidade impecável e repertório perfeito. Foi emocionante!”
                <footer className="mt-3 text-xs text-zinc-400">— Cliente</footer>
              </blockquote>
              <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-200">
                “Equipe organizada e comunicação clara do começo ao fim.”
                <footer className="mt-3 text-xs text-zinc-400">— Cliente</footer>
              </blockquote>
              <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-200">
                “Os músicos chegaram com antecedência e seguiram o cronograma.”
                <footer className="mt-3 text-xs text-zinc-400">— Cerimonial</footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-300/20 to-white/5 p-8">
              <h2 className="text-2xl font-semibold tracking-tight">Vamos conversar sobre o seu casamento?</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-200">
                Envie os dados do evento e retornamos com uma proposta de formação e valores.
              </p>
              <div className="mt-6">
                <Link
                  href="/orcamento"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 font-medium text-zinc-950 hover:bg-amber-200"
                >
                  Solicitar orçamento
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Essência Musical</div>
          <div className="flex gap-3">
            <Link className="hover:text-white" href="/orcamento">
              Orçamento
            </Link>
            <Link className="hover:text-white" href="/login">
              Área interna
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
