"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flag,
  Loader2,
  StickyNote,
  X,
} from "lucide-react";
import { updateShotStudioMeta } from "@/actions/shots";
import { PhotoImage } from "@/components/photo/photo-image";
import type { ContactSheetItem } from "@/components/projects/contact-sheet";
import {
  flagBadgeClass,
  flagShortLabel,
} from "@/components/projects/shot-studio-meta";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioFlag } from "@/types/database";

const FLAGS: { value: StudioFlag; label: string }[] = [
  { value: "none", label: "None" },
  { value: "print", label: "Print" },
  { value: "retouch", label: "Retouch" },
  { value: "hero", label: "Hero" },
  { value: "reject", label: "Reject" },
];

/**
 * Photo-first cinema: image uses almost full viewport.
 * Studio mark is a floating glass card (not a layout column that steals width).
 */
export function CinemaReview({
  projectId,
  items,
  index,
  onIndexChange,
  onClose,
  onShotMetaSaved,
}: {
  projectId: string;
  items: ContactSheetItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onShotMetaSaved?: (
    shotId: string,
    next: { note: string | null; flag: string | null }
  ) => void;
}) {
  const safeIndex = Math.max(0, Math.min(index, Math.max(0, items.length - 1)));
  const shot = items[safeIndex];
  const hasPrev = safeIndex > 0;
  const hasNext = safeIndex < items.length - 1;

  const [note, setNote] = useState(shot?.studio_note ?? "");
  const [flag, setFlag] = useState<StudioFlag>(
    (shot?.studio_flag as StudioFlag) || "none"
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /** Note field collapsed by default — photo stays huge */
  const [noteOpen, setNoteOpen] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const shotId = shot?.id;
  const shotNote = shot?.studio_note;
  const shotFlag = shot?.studio_flag;

  useEffect(() => {
    if (!shotId) return;
    setNote(shotNote ?? "");
    setFlag((shotFlag as StudioFlag) || "none");
    setError(null);
    setNoteOpen(Boolean(shotNote?.trim()));
  }, [shotId, shotNote, shotFlag]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const el = strip.querySelector(`[data-cinema-i="${safeIndex}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [safeIndex]);

  const go = useCallback(
    (dir: -1 | 1) => {
      const next = safeIndex + dir;
      if (next >= 0 && next < items.length) onIndexChange(next);
    },
    [safeIndex, items.length, onIndexChange]
  );

  function persistMeta(nextFlag: StudioFlag, nextNote: string) {
    if (!shot) return;
    startTransition(async () => {
      const res = await updateShotStudioMeta({
        projectId,
        shotId: shot.id,
        studioNote: nextNote,
        studioFlag: nextFlag,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onShotMetaSaved?.(shot.id, {
        note: nextNote.trim() || null,
        flag: nextFlag === "none" ? null : nextFlag,
      });
    });
  }

  function applyFlag(next: StudioFlag) {
    setFlag(next);
    persistMeta(next, note);
  }

  function saveNote() {
    persistMeta(flag, note);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField =
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable);

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (inField) {
          (t as HTMLElement).blur();
          setNoteOpen(false);
          return;
        }
        onClose();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        saveNote();
        return;
      }

      if (e.key === "ArrowLeft" && !inField) {
        e.preventDefault();
        go(-1);
        return;
      }
      if (e.key === "ArrowRight" && !inField) {
        e.preventDefault();
        go(1);
        return;
      }

      if (inField) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setNoteOpen(true);
        requestAnimationFrame(() => noteRef.current?.focus());
        return;
      }

      const flagMap: Record<string, StudioFlag> = {
        "1": "none",
        "2": "print",
        "3": "retouch",
        "4": "hero",
        "5": "reject",
      };
      if (flagMap[e.key]) {
        e.preventDefault();
        applyFlag(flagMap[e.key]);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, onClose, shot?.id, flag, note, projectId]);

  if (!shot || typeof document === "undefined") return null;

  const flagLabel = flagShortLabel(flag === "none" ? null : flag);

  return createPortal(
    <div className="fixed inset-0 z-[280] flex flex-col bg-black">
      {/* Soft vignette only — keep photo the star */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0_0_0/0.55)_100%)]"
        aria-hidden
      />

      {/* Minimal chrome over photo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto min-w-0 rounded-xl bg-black/40 px-3 py-2 backdrop-blur-md">
          <p className="truncate text-sm font-medium text-white/95">
            {shot.alt || "Photo"}
          </p>
          <p className="text-[11px] text-white/50">
            {safeIndex + 1} / {items.length}
            <span className="ml-2 hidden text-white/35 sm:inline">
              ← → · 1–5 · N · Esc
            </span>
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {flagLabel ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow",
                flagBadgeClass(flag === "none" ? null : flag)
              )}
            >
              {flagLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit cinema"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Full-bleed photo stage */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => go(-1)}
          aria-label="Previous photo"
          className={cn(
            "absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition sm:left-4",
            hasPrev ? "hover:bg-black/55" : "cursor-default opacity-20"
          )}
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
        </button>

        <div className="absolute inset-0 sm:inset-y-0 sm:inset-x-0">
          {shot.src ? (
            <PhotoImage
              src={shot.src}
              alt={shot.alt}
              sizes="100vw"
              priority
              className="object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/50">
              Preview pending
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => go(1)}
          aria-label="Next photo"
          className={cn(
            "absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition sm:right-4",
            hasNext ? "hover:bg-black/55" : "cursor-default opacity-20"
          )}
        >
          <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </div>

      {/* Floating studio card — does not steal photo column width */}
      <div className="pointer-events-none absolute bottom-[4.75rem] right-3 z-30 w-[min(17.5rem,calc(100vw-1.5rem))] sm:bottom-24 sm:right-5">
        <div
          className={cn(
            "pointer-events-auto rounded-2xl border border-white/12 bg-black/55 shadow-2xl backdrop-blur-xl",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          )}
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-[11px] font-medium text-white/90">Studio mark</p>
            <p className="text-[10px] text-white/40">Private · photo-first</p>
          </div>

          <div className="space-y-2.5 px-3 py-2.5">
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-white/60">
                <Flag className="h-3 w-3" />
                Flag
                <span className="text-white/30">1–5</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {FLAGS.map((f, i) => (
                  <button
                    key={f.value}
                    type="button"
                    title={`Key ${i + 1}`}
                    disabled={pending}
                    onClick={() => applyFlag(f.value)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium transition",
                      flag === f.value
                        ? f.value === "none"
                          ? "bg-white text-stone-900"
                          : flagBadgeClass(f.value)
                        : "bg-white/10 text-white/75 hover:bg-white/20"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setNoteOpen((v) => !v);
                  if (!noteOpen) {
                    requestAnimationFrame(() => noteRef.current?.focus());
                  }
                }}
                className="mb-1 flex w-full items-center justify-between gap-1 text-[10px] font-medium text-white/60 hover:text-white/80"
              >
                <span className="flex items-center gap-1">
                  <StickyNote className="h-3 w-3" />
                  Note
                  <span className="text-white/30">N</span>
                </span>
                {noteOpen ? (
                  <ChevronDown className="h-3 w-3 opacity-60" />
                ) : (
                  <ChevronUp className="h-3 w-3 opacity-60" />
                )}
              </button>
              {noteOpen ? (
                <>
                  <textarea
                    ref={noteRef}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Retouch skin, crop for album…"
                    className="w-full resize-none rounded-lg border border-white/12 bg-white/10 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/30"
                  />
                  <div className="mt-1.5 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={saveNote}
                      className="h-7 rounded-full bg-white px-3 text-xs text-stone-900 hover:bg-white/90"
                    >
                      {pending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Save note
                    </Button>
                  </div>
                </>
              ) : note.trim() ? (
                <p className="line-clamp-2 text-[11px] leading-snug text-white/55">
                  {note}
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="text-[11px] text-rose-300">{error}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Compact filmstrip */}
      <div className="relative z-20 shrink-0 border-t border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur-md sm:px-4 sm:py-2">
        <div ref={stripRef} className="flex gap-1 overflow-x-auto pb-0.5">
          {items.map((item, i) => {
            const active = i === safeIndex;
            return (
              <button
                key={item.id}
                type="button"
                data-cinema-i={i}
                onClick={() => onIndexChange(i)}
                className={cn(
                  "relative h-9 w-9 shrink-0 overflow-hidden rounded transition sm:h-10 sm:w-10",
                  active
                    ? "ring-2 ring-white ring-offset-1 ring-offset-black"
                    : "opacity-50 hover:opacity-100"
                )}
              >
                {item.src ? (
                  <PhotoImage
                    src={item.src}
                    alt=""
                    sizes="40px"
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
