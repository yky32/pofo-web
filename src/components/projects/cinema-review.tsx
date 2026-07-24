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
  ChevronLeft,
  ChevronRight,
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
 * Cinema review with **layout-integrated** studio mark (no pop-up dialog).
 * Photo stage + side panel for flag/note — macOS gallery feel, tools docked.
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
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Sync form when shot changes (← →)
  const shotId = shot?.id;
  const shotNote = shot?.studio_note;
  const shotFlag = shot?.studio_flag;
  useEffect(() => {
    if (!shotId) return;
    setNote(shotNote ?? "");
    setFlag((shotFlag as StudioFlag) || "none");
    setError(null);
  }, [shotId, shotNote, shotFlag]);

  // Keep filmstrip scrolled to active thumb
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const el = strip.querySelector(`[data-cinema-i="${safeIndex}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
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
        noteRef.current?.focus();
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
  const hasNote = Boolean(note.trim());

  return createPortal(
    <div className="fixed inset-0 z-[280] flex flex-col">
      <div className="dialog-glass-overlay absolute inset-0" aria-hidden />

      {/* Top bar */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/95">
            {shot.alt || "Photo"}
          </p>
          <p className="text-[11px] text-white/50">
            {safeIndex + 1} / {items.length}
            <span className="ml-2 hidden text-white/35 sm:inline">
              ← → · 1–5 flag · N note · Esc exit
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {flagLabel ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                flagBadgeClass(flag === "none" ? null : flag)
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

      {/* Main layout: stage + studio dock (no pop-up) */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Photo stage */}
        <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center px-10 py-2 sm:px-14 lg:px-16">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className={cn(
              "absolute left-1.5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition sm:left-3 sm:h-11 sm:w-11",
              hasPrev ? "hover:bg-white/30" : "cursor-default opacity-25"
            )}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
          </button>

          <div className="relative h-full w-full max-w-4xl">
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              {shot.src ? (
                <PhotoImage
                  src={shot.src}
                  alt={shot.alt}
                  sizes="(max-width:1024px) 90vw, 60vw"
                  priority
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/50">
                  Preview pending
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => go(1)}
            aria-label="Next photo"
            className={cn(
              "absolute right-1.5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition sm:right-3 sm:h-11 sm:w-11",
              hasNext ? "hover:bg-white/30" : "cursor-default opacity-25"
            )}
          >
            <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
          </button>
        </div>

        {/* Studio dock — layout panel, not a modal */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-white/10 bg-black/35 backdrop-blur-xl",
            "max-h-[42vh] border-t lg:max-h-none lg:w-[min(20rem,32vw)] lg:border-l lg:border-t-0"
          )}
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-xs font-medium text-white/90">Studio mark</p>
            <p className="text-[11px] text-white/45">
              Private to you · stays as you browse
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                <Flag className="h-3 w-3" />
                Flag
                <span className="font-normal text-white/35">1–5</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FLAGS.map((f, i) => (
                  <button
                    key={f.value}
                    type="button"
                    title={`Key ${i + 1}`}
                    disabled={pending}
                    onClick={() => applyFlag(f.value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                      flag === f.value
                        ? f.value === "none"
                          ? "bg-white text-stone-900"
                          : flagBadgeClass(f.value)
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                <StickyNote className="h-3 w-3" />
                Note
                <span className="font-normal text-white/35">N</span>
              </p>
              <textarea
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Retouch skin, crop for album…"
                className="w-full resize-none rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
              />
            </div>

            {error ? (
              <p className="text-xs text-rose-300">{error}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={saveNote}
              className="rounded-full bg-white text-stone-900 hover:bg-white/90"
            >
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save note
            </Button>
          </div>
        </aside>
      </div>

      {/* Filmstrip */}
      <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md sm:px-5">
        <div
          ref={stripRef}
          className="flex gap-1.5 overflow-x-auto pb-0.5"
        >
          {items.map((item, i) => {
            const active = i === safeIndex;
            return (
              <button
                key={item.id}
                type="button"
                data-cinema-i={i}
                onClick={() => onIndexChange(i)}
                className={cn(
                  "relative h-11 w-11 shrink-0 overflow-hidden rounded-md transition sm:h-12 sm:w-12",
                  active
                    ? "ring-2 ring-white ring-offset-1 ring-offset-black/50"
                    : "opacity-55 hover:opacity-100"
                )}
              >
                {item.src ? (
                  <PhotoImage
                    src={item.src}
                    alt=""
                    sizes="48px"
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
