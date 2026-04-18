import Link from 'next/link'
import Image from 'next/image'
import { LuxuryHero } from '@/components/landing/hero'
import { TrustSection } from '@/components/landing/trust'
import { ServicesSection } from '@/components/landing/services'
import { GallerySection } from '@/components/landing/gallery'
import { ProcessSection } from '@/components/landing/process'
import { RepertoireSection } from '@/components/landing/repertoire'
import { SoundSection } from '@/components/landing/sound'
import { FaqSection } from '@/components/landing/faq'
import { ContactSection } from '@/components/landing/contact'
import { FinalCtaSection } from '@/components/landing/cta'

export const metadata = {
  title: 'Essência Musical — Música ao Vivo para Casamentos | Sistema Seven',
  description:
    'Banda para casamento, música ao vivo para cerimônia e recepção, formações sob medida, repertório personalizado e sonorização profissional. Solicite um orçamento.',
}

export default function Home() {
  return (
    <div id="topo" className="min-h-[100svh] bg-[#0A0A0A] text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-amber-200/10 bg-[#0A0A0A]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/essencia-logo.svg" alt="Essência Musical" width={180} height={36} className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <a className="rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/5 hover:text-white" href="#servicos">
              Servicos
            </a>
            <a className="rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/5 hover:text-white" href="#galeria">
              Galeria
            </a>
            <a className="hidden rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/5 hover:text-white sm:inline-flex" href="#processo">
              Processo
            </a>
            <a className="hidden rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/5 hover:text-white sm:inline-flex" href="#faq">
              FAQ
            </a>
            <a className="hidden rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/5 hover:text-white sm:inline-flex" href="#contato">
              Orçamento
            </a>
            <Link className="rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/5 hover:text-white" href="/orcamento">
              Formulário
            </Link>
            <Link className="gold-gradient rounded-lg px-3 py-2 font-medium text-zinc-950 transition hover:scale-[1.02] hover:brightness-110" href="/login">
              Área interna
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <LuxuryHero />
        <TrustSection />
        <ServicesSection />
        <GallerySection />
        <ProcessSection />
        <RepertoireSection />
        <SoundSection />
        <FaqSection />
        <ContactSection />
        <FinalCtaSection />
      </main>

      <footer className="border-t border-amber-200/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 text-sm text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Essência Musical</div>
          <div className="flex gap-3">
            <Link className="hover:text-amber-100" href="/orcamento">
              Orçamento
            </Link>
            <Link className="hover:text-amber-100" href="/login">
              Área interna
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
