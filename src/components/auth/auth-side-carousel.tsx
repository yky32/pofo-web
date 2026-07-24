"use client";

import { useCallback, useEffect, useState } from "react";
import { PhotoImage } from "@/components/photo/photo-image";
import { studioPhotos } from "@/lib/photos";
import { cn } from "@/lib/utils";

const SLIDES = [
  studioPhotos.ceremony,
  studioPhotos.golden,
  studioPhotos.kiss,
  studioPhotos.outdoor,
] as const;

const INTERVAL_MS = 4500;

export function AuthSideCarousel() {
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    setIndex(i);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [index]);

  return (
    <div className="relative h-full min-h-full overflow-hidden">
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <PhotoImage
            src={src}
            alt=""
            priority={i === 0}
            sizes="50vw"
            className="object-cover"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-6 p-10 text-white">
        <p className="font-heading text-3xl font-medium leading-snug">
          Your photos.
          <br />
          Beautifully delivered.
        </p>

        <div
          className="flex shrink-0 items-center gap-2 pb-1"
          role="tablist"
          aria-label="Gallery slides"
        >
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show slide ${i + 1} of ${SLIDES.length}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
