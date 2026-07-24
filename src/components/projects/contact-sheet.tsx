"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  CheckSquare,
  LayoutGrid,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Presentation,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { deleteProjectShots } from "@/actions/shots";
import {
  MosaicGrid,
  type ContactViewLayout,
} from "@/components/photo/mosaic-grid";
import { CinemaReview } from "@/components/projects/cinema-review";
import {
  HotkeysHelpButton,
  HotkeysHelpDialog,
} from "@/components/projects/hotkeys-help-dialog";
import {
  flagBadgeClass,
  flagShortLabel,
} from "@/components/projects/shot-studio-meta";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "pofo-contact-view-layout";

const VIEW_MODES: {
  id: ContactViewLayout;
  label: string;
  hint: string;
  icon: typeof LayoutGrid;
}[] = [
  {
    id: "mosaic",
    label: "Mosaic",
    hint: "Mixed sizes · cinematic pack",
    icon: LayoutTemplate,
  },
  {
    id: "square",
    label: "Square",
    hint: "Even grid · classic contact sheet",
    icon: LayoutGrid,
  },
  {
    id: "dense",
    label: "Dense",
    hint: "More columns · scan faster",
    icon: LayoutGrid,
  },
  {
    id: "large",
    label: "Large",
    hint: "Bigger tiles · review detail",
    icon: Maximize2,
  },
];

function parseViewLayout(raw: string | null): ContactViewLayout {
  if (raw === "mosaic" || raw === "square" || raw === "dense" || raw === "large")
    return raw;
  return "mosaic";
}

export type ContactSheetItem = {
  id: string;
  src: string;
  alt: string;
  studio_note?: string | null;
  studio_flag?: string | null;
  /** jpeg | raw | paired | final | preview */
  kind?: string | null;
  /** companion RAW present */
  has_raw?: boolean;
  processing_status?: string | null;
};

/** Media type chip for photographer contact sheet */
function mediaBadge(
  kind?: string | null,
  hasRaw?: boolean,
  processing?: string | null
): { label: string; className: string } | null {
  if (kind === "paired" || (hasRaw && kind !== "raw")) {
    return {
      label: "JPEG+RAW",
      className: "bg-amber-500/95 text-amber-950",
    };
  }
  if (kind === "raw") {
    return {
      label: processing === "pending" ? "RAW · …" : "RAW",
      className: "bg-orange-600/95 text-white",
    };
  }
  // Normal / jpeg / final with web preview
  if (kind === "jpeg" || kind === "final" || kind === "preview" || !kind) {
    return {
      label: "JPEG",
      className: "bg-black/50 text-white backdrop-blur-sm",
    };
  }
  return null;
}

export function ContactSheet({
  projectId,
  items: initialItems,
}: {
  projectId: string;
  items: ContactSheetItem[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const viewMenuId = useId();
  const viewTriggerRef = useRef<HTMLButtonElement>(null);
  const viewPanelRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [viewLayout, setViewLayout] = useState<ContactViewLayout>("mosaic");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewMounted, setViewMounted] = useState(false);
  const [viewPos, setViewPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  /** Cinema / gallery review index; null = off */
  const [cinemaIndex, setCinemaIndex] = useState<number | null>(null);
  /** Last opened shot — for Space toggle in select mode */
  const lastShotIdRef = useRef<string | null>(null);
  /** Soft delete handoff — avoid grid glitch on refresh */
  const [deletePhase, setDeletePhase] = useState<
    null | "removing" | "refreshing" | "done"
  >(null);
  const [deleteCount, setDeleteCount] = useState(0);
  const [fadingIds, setFadingIds] = useState<Set<string>>(() => new Set());
  const [refreshPending, startRefresh] = useTransition();
  const skipNextItemsSync = useRef(false);

  useEffect(() => {
    // Don't clobber optimistic remove mid-delete
    if (deletePhase) return;
    if (skipNextItemsSync.current) {
      skipNextItemsSync.current = false;
      setItems(initialItems);
      return;
    }
    setItems(initialItems);
  }, [initialItems, deletePhase]);

  // Clear delete curtain after refresh settles
  useEffect(() => {
    if (deletePhase !== "refreshing") return;
    if (refreshPending) return;
    setDeletePhase("done");
    const t = window.setTimeout(() => {
      setDeletePhase(null);
      setDeleteCount(0);
      setFadingIds(new Set());
    }, 650);
    return () => window.clearTimeout(t);
  }, [deletePhase, refreshPending]);

  useEffect(() => {
    setViewMounted(true);
    try {
      setViewLayout(parseViewLayout(localStorage.getItem(VIEW_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
  }, []);

  function setView(next: ContactViewLayout) {
    setViewLayout(next);
    setViewOpen(false);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!viewOpen) return;
    function place() {
      const el = viewTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 8;
      const margin = 8;
      const right = Math.max(margin, window.innerWidth - r.right);
      const spaceBelow = window.innerHeight - r.bottom - gap - margin;
      if (spaceBelow >= 220) {
        setViewPos({ top: r.bottom + gap, bottom: undefined, right });
      } else {
        setViewPos({
          top: undefined,
          bottom: window.innerHeight - r.top + gap,
          right,
        });
      }
    }
    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [viewOpen]);

  useEffect(() => {
    if (!viewOpen) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (viewTriggerRef.current?.contains(t)) return;
      if (viewPanelRef.current?.contains(t)) return;
      setViewOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [viewOpen]);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const count = selected.size;
  const allSelected = items.length > 0 && count === items.length;
  const exitSelect = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
    setError(null);
  }, []);

  function toggle(id: string) {
    lastShotIdRef.current = id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function openCinema(atId?: string) {
    const id = atId ?? lastShotIdRef.current ?? items[0]?.id;
    if (!id) return;
    const idx = items.findIndex((i) => i.id === id);
    setCinemaIndex(idx >= 0 ? idx : 0);
    setViewOpen(false);
    setHotkeysOpen(false);
    if (selectMode) exitSelect();
  }

  // Global shortcuts when not typing in an input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField =
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable);

      // ? always opens help (shift+/ on many layouts is also "?")
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        if (inField) return;
        e.preventDefault();
        setHotkeysOpen(true);
        setViewOpen(false);
        return;
      }

      if (hotkeysOpen) return; // dialog handles Esc
      if (cinemaIndex !== null) return; // cinema owns keys
      if (inField) return;

      // C = cinema mode (studio mark is a layout panel inside)
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        openCinema();
        return;
      }

      // ← → on grid: enter cinema and step
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        const baseId = lastShotIdRef.current ?? items[0]?.id;
        if (!baseId) return;
        let idx = items.findIndex((i) => i.id === baseId);
        if (idx < 0) idx = 0;
        const next = Math.max(0, Math.min(items.length - 1, idx + dir));
        lastShotIdRef.current = items[next].id;
        setCinemaIndex(next);
        return;
      }

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (selectMode) exitSelect();
        else {
          setSelectMode(true);
          setMessage(null);
          setError(null);
        }
        return;
      }

      if (!selectMode) return;

      if (e.key === "Escape") {
        e.preventDefault();
        exitSelect();
        return;
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        toggleAll();
        return;
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        const id = lastShotIdRef.current ?? items[0]?.id;
        if (id) toggle(id);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace" || e.key === "d" || e.key === "D") {
        if (!selected.size) return;
        e.preventDefault();
        void onDelete();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectMode,
    hotkeysOpen,
    cinemaIndex,
    selected,
    items,
    exitSelect,
    allSelected,
    allIds,
  ]);

  async function onDelete() {
    if (!count || deletePhase) return;
    const n = count;
    const ok = await confirm({
      title: n === 1 ? "Delete this photo?" : `Delete ${n} photos?`,
      description:
        "This cannot be undone. Photos are removed from the gallery and storage.",
      confirmLabel: n === 1 ? "Delete photo" : `Delete ${n}`,
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    const ids = [...selected];
    setError(null);
    setMessage(null);
    setDeleteCount(n);
    setFadingIds(new Set(ids));
    setDeletePhase("removing");

    // Brief fade before server call so tiles don’t hard-pop
    await new Promise((r) => window.setTimeout(r, 220));

    startTransition(async () => {
      const res = await deleteProjectShots({
        projectId,
        shotIds: ids,
      });
      if (res.error) {
        setError(res.error);
        setDeletePhase(null);
        setFadingIds(new Set());
        setDeleteCount(0);
        return;
      }

      // Optimistic local remove — grid shrinks smoothly
      skipNextItemsSync.current = true;
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      setSelected(new Set());
      setSelectMode(false);
      setMessage(res.success ?? `Deleted ${res.deleted ?? n}.`);
      setDeletePhase("refreshing");
      setFadingIds(new Set());

      startRefresh(() => {
        try {
          router.refresh();
        } catch {
          /* ignore */
        }
      });
    });
  }

  const deleting =
    deletePhase === "removing" ||
    deletePhase === "refreshing" ||
    deletePhase === "done";

  if (!items.length && !deleting) return null;

  return (
    <div className="relative space-y-3">
      {viewMounted && deleting
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed inset-0 z-[240] flex items-end justify-center p-6 sm:items-center",
                "bg-stone-950/25 backdrop-blur-[2px] transition-opacity duration-300",
                deletePhase === "done" ? "opacity-0" : "opacity-100"
              )}
              aria-live="polite"
              aria-busy={deletePhase !== "done"}
            >
              <div
                className={cn(
                  "pointer-events-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/95 p-5 shadow-2xl shadow-stone-900/15 backdrop-blur-xl",
                  "animate-in fade-in-0 zoom-in-95 duration-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      deletePhase === "done"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    )}
                  >
                    {deletePhase === "done" ? (
                      <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
                    ) : deletePhase === "removing" ? (
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        strokeWidth={1.75}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-stone-900">
                      {deletePhase === "done"
                        ? deleteCount === 1
                          ? "Photo removed"
                          : `${deleteCount} photos removed`
                        : deletePhase === "removing"
                          ? deleteCount === 1
                            ? "Deleting photo…"
                            : `Deleting ${deleteCount} photos…`
                          : "Updating gallery…"}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                      {deletePhase === "done"
                        ? "Contact sheet updated"
                        : deletePhase === "removing"
                          ? "Removing from gallery and storage"
                          : "Refreshing the contact sheet"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500 ease-out",
                      deletePhase === "done" ? "bg-emerald-600" : "bg-rose-700",
                      deletePhase === "refreshing" && "animate-pulse"
                    )}
                    style={{
                      width:
                        deletePhase === "removing"
                          ? "55%"
                          : deletePhase === "refreshing"
                            ? "88%"
                            : "100%",
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Count lives above the tabs — this row is only context / selection */}
        <p className="text-sm text-stone-400">
          {selectMode ? (
            count > 0 ? (
              <span className="font-medium text-stone-800">
                {count} selected
              </span>
            ) : (
              <span>Select photos to download or delete</span>
            )
          ) : (
            <span>Tap a photo for studio mode</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <HotkeysHelpButton onClick={() => setHotkeysOpen(true)} />

          {/* Cinema review — macOS-style full browse */}
          <button
            type="button"
            aria-label="Cinema review"
            title="Cinema review (C) · ← → to browse"
            onClick={() => openCinema()}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition",
              "hover:bg-stone-50 hover:text-stone-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
              cinemaIndex !== null && "ring-2 ring-stone-300"
            )}
          >
            <Presentation className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>

          {/* View layout */}
          <button
            ref={viewTriggerRef}
            type="button"
            aria-expanded={viewOpen}
            aria-haspopup="menu"
            aria-controls={viewOpen ? viewMenuId : undefined}
            aria-label="View layout"
            title="View layout"
            onClick={() => setViewOpen((v) => !v)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition",
              "hover:bg-stone-50 hover:text-stone-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
              viewOpen && "ring-2 ring-stone-300"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>

          {selectMode ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={allSelected ? "Deselect all" : "Select all"}
                title={allSelected ? "Deselect all" : "Select all"}
                className="h-8 w-8 rounded-full p-0 text-stone-600"
                disabled={pending}
                onClick={toggleAll}
              >
                {allSelected ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                aria-label={
                  pending || deleting
                    ? "Deleting"
                    : count
                      ? `Delete ${count} selected`
                      : "Delete"
                }
                title={
                  pending || deleting
                    ? "Deleting…"
                    : count
                      ? `Delete (${count})`
                      : "Delete"
                }
                className="h-8 w-8 rounded-full bg-rose-700 p-0 text-white hover:bg-rose-800"
                disabled={pending || deleting || count === 0}
                onClick={onDelete}
              >
                {pending || deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Cancel selection"
                title="Cancel"
                className="h-8 w-8 rounded-full p-0"
                disabled={pending || deleting}
                onClick={exitSelect}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Select photos"
              title="Select"
              className="h-8 w-8 rounded-full border-stone-300 p-0"
              onClick={() => {
                setSelectMode(true);
                setMessage(null);
                setError(null);
              }}
            >
              <CheckSquare className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {viewMounted && viewOpen && viewPos
        ? createPortal(
            <>
              <div
                className="dialog-glass-overlay fixed inset-0 z-[200]"
                aria-hidden
                onClick={() => setViewOpen(false)}
              />
              <div
                ref={viewPanelRef}
                id={viewMenuId}
                role="menu"
                aria-label="View layout"
                style={{
                  top: viewPos.top,
                  bottom: viewPos.bottom,
                  right: viewPos.right,
                }}
                className={cn(
                  "dialog-glass-panel fixed z-[201] w-[min(15.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl py-1",
                  "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
              >
                <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                  Layout
                </p>
                {VIEW_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = viewLayout === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => setView(mode.id)}
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2 text-left transition",
                        active ? "bg-stone-900/5" : "hover:bg-stone-900/5"
                      )}
                    >
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-stone-500"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-stone-900">
                          {mode.label}
                        </span>
                        <span className="block text-[11px] leading-snug text-stone-500">
                          {mode.hint}
                        </span>
                      </span>
                      {active ? (
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-900"
                          strokeWidth={2}
                        />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          )
        : null}

      {error ? (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-emerald-700">{message}</p>
      ) : null}

      <HotkeysHelpDialog
        open={hotkeysOpen}
        onClose={() => setHotkeysOpen(false)}
      />

      {cinemaIndex !== null ? (
        <CinemaReview
          projectId={projectId}
          items={items}
          index={cinemaIndex}
          onIndexChange={(i) => {
            setCinemaIndex(i);
            lastShotIdRef.current = items[i]?.id ?? null;
          }}
          onClose={() => setCinemaIndex(null)}
          onShotMetaSaved={(shotId, next) => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === shotId
                  ? { ...i, studio_note: next.note, studio_flag: next.flag }
                  : i
              )
            );
            router.refresh();
          }}
        />
      ) : null}

      {items.length ? (
      <MosaicGrid
        items={items}
        density="studio"
        layout={viewLayout}
        onItemClick={(item) => {
          if (pending || deleting) return;
          lastShotIdRef.current = item.id;
          if (selectMode) {
            toggle(item.id);
            return;
          }
          // Open cinema with docked studio mark (no pop-up)
          openCinema(item.id);
        }}
        itemClassName={({ item }) =>
          cn(
            "cursor-pointer transition duration-300 ease-out",
            fadingIds.has(item.id) && "scale-[0.96] opacity-30"
          )
        }
        renderTile={({ item, image }) => {
          const isOn = selected.has(item.id);
          const full = items.find((i) => i.id === item.id);
          const flag = full?.studio_flag;
          const hasNote = Boolean(full?.studio_note?.trim());
          const label = flagShortLabel(flag);
          const media = mediaBadge(
            full?.kind,
            full?.has_raw,
            full?.processing_status
          );
          return (
            <>
              <div
                className={cn(
                  "absolute inset-0 transition duration-300",
                  fadingIds.has(item.id) && "opacity-40 grayscale"
                )}
              >
                {image}
              </div>
              {selectMode ? (
                <span
                  className={cn(
                    "absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition",
                    isOn
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-white/90 bg-black/25 text-transparent backdrop-blur-sm"
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : (
                <>
                  <div className="absolute left-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] flex-wrap gap-1">
                    {label ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow",
                          flagBadgeClass(flag)
                        )}
                      >
                        {label}
                      </span>
                    ) : null}
                    {hasNote ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white shadow backdrop-blur-sm">
                        <StickyNote className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </div>
                  {media ? (
                    <span
                      className={cn(
                        "absolute bottom-1.5 left-1.5 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow",
                        media.className
                      )}
                    >
                      {media.label}
                    </span>
                  ) : null}
                </>
              )}
            </>
          );
        }}
      />
      ) : deleting ? (
        <div className="flex min-h-[12rem] items-center justify-center rounded-[8px] border border-dashed border-stone-200 bg-stone-50/50">
          <p className="text-sm text-stone-400">Updating gallery…</p>
        </div>
      ) : null}

    </div>
  );
}
