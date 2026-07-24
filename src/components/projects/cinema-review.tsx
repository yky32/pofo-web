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

const FLAGS: { value: StudioFlag; label: string; short: string }[] = [
  { value: "none", label: "None", short: "·" },
  { value: "print", label: "Print", short: "P" },
  { value: "retouch", label: "Retouch", short: "R" },
  { value: "hero", label: "Hero", short: "H" },
  { value: "reject", label: "Reject", short: "X" },
];

/**
 * Photo-first cinema: the image owns the full viewport.
 * All chrome (nav, flags, filmstrip) floats as thin overlays and
 * auto-hides so the photo stays the product.
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
  const [noteOpen, setNoteOpen] = useState(false);
  /** Chrome visible — auto-hides so photo is full-bleed */
  const [chromeVisible, setChromeVisible] = useState(true);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteOpenRef = useRef(false);

  const shotId = shot?.id;
  const shotNote = shot?.studio_note;
  const shotFlag = shot?.studio_flag;

  useEffect(() => {
    noteOpenRef.current = noteOpen;
    if (noteOpen) setChromeVisible(true);
  }, [noteOpen]);

  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      // Keep chrome while note editor is open
      if (!noteOpenRef.current) setChromeVisible(false);
    }, 2200);
  }, []);

  useEffect(() => {
    bumpChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [bumpChrome, safeIndex]);

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
    bumpChrome();
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
        if (noteOpen) {
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
        setChromeVisible(true);
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
  }, [go, onClose, shot?.id, flag, note, projectId, noteOpen]);

  if (!shot || typeof document === "undefined") return null;

  const flagLabel = flagShortLabel(flag === "none" ? null : flag);
  const chromeInteractive = chromeVisible || noteOpen;

  return createPortal(
    <div
      className="fixed inset-0 z-[280] bg-black"
      onMouseMove={bumpChrome}
      onPointerDown={bumpChrome}
    >
      {/* Soft vignette — photo stays the star */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_45%,oklch(0_0_0/0.45)_100%)]"
        aria-hidden
      />

      {/* ── Full-viewport photo (no layout chrome steals pixels) ── */}
      <div className="absolute inset-0 z-0">
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

      {/* Edge hit zones for prev/next (invisible, always active) */}
      <button
        type="button"
        disabled={!hasPrev}
        onClick={() => go(-1)}
        aria-label="Previous photo"
        className="absolute inset-y-0 left-0 z-10 w-[12%] max-w-[5rem] cursor-w-resize bg-transparent disabled:cursor-default"
      />
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => go(1)}
        aria-label="Next photo"
        className="absolute inset-y-0 right-0 z-10 w-[12%] max-w-[5rem] cursor-e-resize bg-transparent disabled:cursor-default"
      />

      {/* ── Overlays — never shrink the photo ── */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 transition-opacity duration-300",
          chromeInteractive ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Top: counter + flag chip + close */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-3">
          <div
            className={cn(
              "pointer-events-auto flex min-w-0 items-center gap-2 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md",
              !chromeInteractive && "pointer-events-none"
            )}
          >
            <span className="truncate text-[11px] font-medium text-white/90 sm:text-xs">
              {safeIndex + 1}
              <span className="text-white/40"> / {items.length}</span>
            </span>
            {flagLabel ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
                  flagBadgeClass(flag === "none" ? null : flag)
                )}
              >
                {flagLabel}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit cinema"
            className={cn(
              "pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65",
              !chromeInteractive && "pointer-events-none"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Side chevrons (visual only — hit zones above handle click) */}
        <div
          className={cn(
            "pointer-events-none absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm sm:left-3",
            !hasPrev && "opacity-0"
          )}
          aria-hidden
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm sm:right-3",
            !hasNext && "opacity-0"
          )}
          aria-hidden
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
        </div>

        {/* Hotkey tooltip — bottom-left, above filmstrip (photo-first glass) */}
        <div
          className="pointer-events-none absolute bottom-[3.5rem] left-3 z-30 sm:bottom-14 sm:left-4"
          aria-hidden
        >
          <div className="rounded-xl border border-white/12 bg-black/55 px-2.5 py-2 shadow-xl backdrop-blur-xl">
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-wider text-white/40">
              Shortcuts
            </p>
            <ul className="space-y-1">
              {(
                [
                  { keys: ["←", "→"], label: "Browse" },
                  { keys: ["1–5"], label: "Flag" },
                  { keys: ["N"], label: "Note" },
                  { keys: ["Esc"], label: "Exit" },
                ] as const
              ).map((row) => (
                <li
                  key={row.label}
                  className="flex items-center gap-2 text-[11px] leading-none"
                >
                  <span className="flex min-w-[2.75rem] items-center gap-0.5">
                    {row.keys.map((k) => (
                      <kbd
                        key={k}
                        className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md border border-white/15 bg-white/10 px-1 py-0.5 font-mono text-[10px] font-medium text-white/90"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                  <span className="text-white/55">{row.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom dock: compact flags + filmstrip — one thin band */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent pt-10",
            chromeInteractive ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          {/* Flag row + note toggle — single line */}
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-1.5 px-3 pb-1.5">
            <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/50 p-0.5 backdrop-blur-xl">
              {FLAGS.map((f, i) => {
                const keyNum = i + 1;
                const active = flag === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    title={`${f.label} (${keyNum})`}
                    disabled={pending}
                    onClick={() => applyFlag(f.value)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition sm:px-2.5",
                      active
                        ? f.value === "none"
                          ? "bg-white text-stone-900"
                          : flagBadgeClass(f.value)
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <kbd
                      className={cn(
                        "inline-flex h-3.5 min-w-[0.875rem] items-center justify-center rounded px-0.5 font-mono text-[9px] font-semibold leading-none",
                        active
                          ? f.value === "none"
                            ? "bg-stone-900/10 text-stone-700"
                            : "bg-black/15 text-current"
                          : "bg-white/12 text-white/55"
                      )}
                    >
                      {keyNum}
                    </kbd>
                    <span className="sm:hidden">{f.short}</span>
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              title="Note (N)"
              onClick={() => {
                setNoteOpen((v) => !v);
                setChromeVisible(true);
                if (!noteOpen) {
                  requestAnimationFrame(() => noteRef.current?.focus());
                }
              }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/75 backdrop-blur-xl transition hover:bg-black/65 hover:text-white",
                noteOpen && "bg-white/20 text-white",
                note.trim() && !noteOpen && "text-amber-200"
              )}
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />
            ) : null}
          </div>

          {/* Expanded note — only when open */}
          {noteOpen ? (
            <div className="mx-auto mb-1.5 w-full max-w-md px-3">
              <div className="rounded-xl border border-white/12 bg-black/60 p-2 shadow-xl backdrop-blur-xl">
                <textarea
                  ref={noteRef}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Retouch, crop, album note…"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/25"
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                  {error ? (
                    <p className="text-[11px] text-rose-300">{error}</p>
                  ) : (
                    <span className="text-[10px] text-white/35">
                      ⌘↵ save · Esc close
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={saveNote}
                    className="h-6 rounded-full bg-white px-2.5 text-[11px] text-stone-900 hover:bg-white/90"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Ultra-compact filmstrip */}
          <div className="px-2 pb-2 sm:px-3 sm:pb-2.5">
            <div
              ref={stripRef}
              className="flex justify-center gap-0.5 overflow-x-auto"
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
                      "relative h-7 w-7 shrink-0 overflow-hidden rounded transition sm:h-8 sm:w-8",
                      active
                        ? "ring-2 ring-white ring-offset-1 ring-offset-black"
                        : "opacity-40 hover:opacity-90"
                    )}
                  >
                    {item.src ? (
                      <PhotoImage
                        src={item.src}
                        alt=""
                        sizes="32px"
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
        </div>
      </div>
    </div>,
    document.body
  );
}
