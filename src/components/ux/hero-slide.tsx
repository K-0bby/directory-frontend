"use client";

import useEmblaCarousel from "embla-carousel-react";
import {useMemo, useEffect, useState} from "react";
import Image from "next/image";
import {CategoryDetailMedia} from "@/lib/data";

export function HeroCarousel({
  items,
  alt,
}: {
  items: CategoryDetailMedia[];
  alt: string;
}) {
  const heroItems = useMemo(
    () =>
      items.map((m) => {
        if (typeof m === "string") {
          const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(m);
          return { type: isVideo ? ("video" as const) : ("image" as const), src: m };
        }
        return m;
      })
      .filter((m) => m.type !== "video" || !!m.poster || !m.src.includes("_next/image")),
    [items]
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();

    // Auto-scroll every 4 seconds; pauses while the user is dragging
    let paused = false;
    const onPointerDown = () => { paused = true; };
    const onPointerUp   = () => { paused = false; };
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp",   onPointerUp);

    const timer = setInterval(() => {
      if (!paused) emblaApi.scrollNext();
    }, 4000);

    return () => {
      clearInterval(timer);
      emblaApi.off("select",      onSelect);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp",   onPointerUp);
    };
  }, [emblaApi]);

  return (
    <div className="relative w-full">
      <div className="h-[360px] w-full overflow-hidden rounded-none" ref={emblaRef}>
        <div className="flex h-full">
          {heroItems.map((item, i) => (
            <div key={i} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative h-[400px] w-full">
                <Image
                  src={item.type === "image" ? item.src : item.poster || item.src}
                  alt={alt}
                  fill
                  sizes="100vw"
                  className="object-cover bg-red-100"
                  priority={i === 0}
                  unoptimized
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {heroItems.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2 w-2 rounded-full ${
              i === selected ? "bg-white h-2 w-4" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}