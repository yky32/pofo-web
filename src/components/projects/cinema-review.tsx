"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  StickyNote,
  X,
} from "lucide-react";
import { PhotoImage } from "@/components/photo/photo-image";
import {
  flagBadgeClass,
  flagShortLabel,
} from "@/components/projects/shot-studio-meta";
import { cn } from "@/lib/utils";
import type { ContactSheetItem } from "@/components/projects/contact-sheet";

/**
 * macOS-style cinema / gallery review — full-screen browse with ← →.
 */
export function CinemaReview({
  items,
  index,
  onIndexChange,
  onClose,
  onOpenMark,
}: {
  items: ContactSheetItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Open studio mark for current shot */
  onOpenMark?: (id: string) => void;
}) {
  const safeIndex = Math.max(0, Math.min(index, items.length - 1));
  const shot = items[safeIndex];
  const hasPrev = safeIndex > 0;
  const hasNext = safeIndex < items.length - 1;

  const go = useCallback(
    (dir: -1 | 1) => {
      const next = safeIndex + dir;
      if (next >= 0 && next < items.length) onIndexChange(next);
    },
    [safeIndex, items.length, onIndexChange]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
        return;
      }
      if (e.key === "Enter" && shot) {
        e.preventDefault();
        onOpenMark?.(shot.id);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [go, onClose, onOpenMark, shot]);

  if (!shot || typeof document === "undefined") return null;

  const flagLabel = flagShortLabel(shot.studio_flag);
  const hasNote = Boolean(shot.studio_note?.trim());

  return createPortal(
    <div className="fixed inset-0 z-[280] flex flex-col">
      <div
        className="dialog-glass-overlay absolute inset-0"
        aria-hidden
        onClick={onClose}
      />

      {/* Top bar */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/95">
            {shot.alt || "Photo"}
          </p>
          <p className="text-[11px] text-white/55">
            {safeIndex + 1} / {items.length}
            <span className="ml-2 text-white/40">
              ← → · Enter mark · Esc exit
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {flagLabel ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                flagBadgeClass(shot.studio_flag)
              )}
            >
              {flagLabel}
            </span>
          ) : null}
          {hasNote ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white">
              <StickyNote className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit cinema"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-12 sm:px-16">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => go(-1)}
          aria-label="Previous photo"
          className={cn(
            "absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition sm:left-4",
            hasPrev ? "hover:bg-white/30" : "cursor-default opacity-25"
          )}
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          className="relative h-full max-h-full w-full max-w-5xl cursor-default"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => onOpenMark?.(shot.id)}
        >
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            {shot.src ? (
              <PhotoImage
                src={shot.src}
                alt={shot.alt}
                sizes="90vw"
                priority
                className="object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/50">
                Preview pending
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => go(1)}
          aria-label="Next photo"
          className={cn(
            "absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition sm:right-4",
            hasNext ? "hover:bg-white/30" : "cursor-default opacity-25"
          )}
        >
          <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </div>

      {/* Filmstrip */}
      <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/20 px-3 py-2.5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto pb-0.5">
          {items.map((item, i) => {
            const active = i === safeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onIndexChange(i)}
                className={cn(
                  "relative h-12 w-12 shrink-0 overflow-hidden rounded-md transition sm:h-14 sm:w-14",
                  active
                    ? "ring-2 ring-white ring-offset-1 ring-offset-black/40"
                    : "opacity-60 hover:opacity-100"
                )}
              >
                {item.src ? (
                  <PhotoImage
                    src={item.src}
                    alt=""
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-white/10" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
