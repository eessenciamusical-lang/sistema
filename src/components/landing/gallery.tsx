import Image from "next/image";
import { Reveal } from "@/components/landing/reveal";

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
    alt: "Cantora e banda em palco de casamento",
    span: "sm:col-span-2 sm:row-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80",
    alt: "Violinista em apresentacao elegante",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
    alt: "Saxofonista em apresentacao ao vivo",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80",
    alt: "Banda com iluminacao cenica dourada",
    span: "sm:col-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=1200&q=80",
    alt: "Detalhe de instrumento e maos em performance",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1521337706264-a414f153a5a6?auto=format&fit=crop&w=1200&q=80",
    alt: "Equipe musical em palco com iluminacao suave",
    span: "",
  },
];

export function GallerySection() {
  return (
    <section id="galeria" className="border-t border-amber-200/10">
      <div className="mx-auto max-w-7xl px-4 py-18 sm:py-24">
        <Reveal>
          <p className="text-xs tracking-[0.22em] text-amber-200/70">GALERIA</p>
          <h2 className="mt-3 font-display text-3xl text-zinc-50 sm:text-4xl">Membros, instrumentos e emocao em cena</h2>
        </Reveal>

        <div className="mt-10 grid auto-rows-[180px] grid-cols-1 gap-4 sm:grid-cols-3 sm:auto-rows-[220px]">
          {GALLERY.map((item, i) => (
            <Reveal key={item.src} delayMs={i * 90}>
              <figure className={`relative h-full overflow-hidden rounded-2xl border border-amber-200/15 ${item.span}`}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
