"use client";

import { useMemo, useState } from "react";
import { Heart, Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PhotoImage } from "@/components/photo/photo-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientGalleryPayload } from "@/types/database";

/** Local-only hearts for /g/demo-* (no Supabase). */
export function ClientGalleryDemo({
  payload,
}: {
  payload: ClientGalleryPayload;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const limit = payload.project.selection_limit;

  const cover =
    payload.shots.find((s) => s.preview_url)?.preview_url ?? null;

  const subtitle = useMemo(() => {
    return (
      [payload.project.client_name, payload.project.description]
        .filter(Boolean)
        .join(" · ") || "Tap hearts to select favorites"
    );
  }, [payload.project]);

  function onToggle(shotId: string) {
    setMessage(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(shotId)) {
        next.delete(shotId);
        return next;
      }
      if (next.size >= limit) {
        setMessage(`You can select up to ${limit} photos.`);
        return prev;
      }
      next.add(shotId);
      return next;
    });
  }

  const count = selected.size;

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.01_50)] text-stone-100">
      <header className="relative">
        <div className="relative h-[42vh] min-h-[280px] max-h-[420px]">
          {cover ? (
            <PhotoImage
              src={cover}
              alt="Gallery cover"
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-stone-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.01_50)] via-[oklch(0.12_0.01_50_/_0.4)] to-black/20" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-8">
            <Logo className="text-white" markClassName="text-white" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur">
              <Lock className="h-3 w-3" />
              Private · demo
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-8">
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">
              Shared with you
            </p>
            <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
              {payload.project.title}
            </h1>
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b border-white/5 bg-[oklch(0.12_0.01_50)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <p className="text-sm text-stone-400">
            Select up to <span className="text-stone-200">{limit}</span> photos
          </p>
          <Button
            size="sm"
            className="rounded-full bg-white text-stone-900 hover:bg-stone-200"
          >
            <Heart
              className={cn(
                "mr-1.5 h-3.5 w-3.5",
                count > 0 && "fill-stone-900"
              )}
            />
            {count} / {limit}
          </Button>
        </div>
        {message ? (
          <p className="border-t border-white/5 px-4 py-2 text-center text-xs text-amber-200/90">
            {message}
          </p>
        ) : null}
      </div>

      <main className="mx-auto max-w-6xl px-2 py-6 sm:px-4 sm:py-8">
        <div className="columns-2 gap-2 sm:columns-3 sm:gap-3 md:columns-4">
          {payload.shots.map((shot, i) => {
            const src = shot.preview_url;
            if (!src) return null;
            const tall = i % 5 === 0 || i % 7 === 3;
            const isOn = selected.has(shot.id);
            return (
              <button
                key={shot.id}
                type="button"
                onClick={() => onToggle(shot.id)}
                className="group relative mb-2 w-full break-inside-avoid overflow-hidden sm:mb-3"
              >
                <div
                  className={
                    tall ? "relative aspect-[3/4]" : "relative aspect-square"
                  }
                >
                  <PhotoImage
                    src={src}
                    alt={shot.filename ?? `Photo ${i + 1}`}
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div
                    className={cn(
                      "absolute inset-0 transition",
                      isOn
                        ? "bg-black/25"
                        : "bg-black/0 group-hover:bg-black/15"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition",
                      isOn
                        ? "bg-white text-rose-600 opacity-100"
                        : "bg-white/90 text-stone-800 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Heart
                      className={cn("h-3.5 w-3.5", isOn && "fill-rose-600")}
                    />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-10 text-center text-xs text-stone-600">
          Demo gallery · selections stay on this device
        </p>
      </main>
    </div>
  );
}
