"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function ParallaxImage({ src, alt, fill, width, height, className, sizes, priority }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const center = rect.top + rect.height / 2;
      const dist = center - vh / 2;
      const progress = Math.max(-1, Math.min(1, dist / vh));
      setOffset(progress * -18);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className="h-full w-full overflow-hidden">
      <div style={{ transform: `translateY(${offset}px) scale(1.06)` }} className="h-full w-full transition-transform duration-200">
        <Image src={src} alt={alt} fill={fill} width={width} height={height} className={className} sizes={sizes} priority={priority} />
      </div>
    </div>
  );
}

