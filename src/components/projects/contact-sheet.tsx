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
  LayoutGrid,
  LayoutTemplate,
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
  ShotStudioMetaPanel,
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
  const [metaShotId, setMetaShotId] = useState<string | null>(null);
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

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
  const metaShot = metaShotId
    ? items.find((i) => i.id === metaShotId) ?? null
    : null;

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

  function navigateMeta(dir: -1 | 1) {
    if (!metaShotId) return;
    const idx = items.findIndex((i) => i.id === metaShotId);
    if (idx < 0) return;
    const next = items[idx + dir];
    if (next) {
      setMetaShotId(next.id);
      lastShotIdRef.current = next.id;
    }
  }

  function openCinema(atId?: string) {
    const id = atId ?? lastShotIdRef.current ?? items[0]?.id;
    if (!id) return;
    const idx = items.findIndex((i) => i.id === id);
    setCinemaIndex(idx >= 0 ? idx : 0);
    setMetaShotId(null);
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
      if (metaShotId) return; // studio panel owns keys while open

      // C = cinema mode
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        openCinema();
        return;
      }

      // ← → on grid: enter cinema at last/first and step
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
          setMetaShotId(null);
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
    metaShotId,
    selected,
    items,
    exitSelect,
    allSelected,
    allIds,
  ]);

  async function onDelete() {
    if (!count) return;
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
    startTransition(async () => {
      const res = await deleteProjectShots({
        projectId,
        shotIds: ids,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(res.success ?? `Deleted ${res.deleted ?? n}.`);
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    });
  }

  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-500">
          {items.length} photo{items.length === 1 ? "" : "s"}
          {selectMode && count > 0 ? (
            <span className="ml-1.5 font-medium text-stone-800">
              · {count} selected
            </span>
          ) : (
            <span className="ml-1.5 text-stone-400">
              · tap a photo for notes
            </span>
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
                className="rounded-full text-stone-600"
                disabled={pending}
                onClick={toggleAll}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-rose-700 text-white hover:bg-rose-800"
                disabled={pending || count === 0}
                onClick={onDelete}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {pending ? "Deleting…" : `Delete${count ? ` (${count})` : ""}`}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={pending}
                onClick={exitSelect}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-stone-300"
              onClick={() => {
                setSelectMode(true);
                setMessage(null);
                setError(null);
                setMetaShotId(null);
              }}
            >
              Select
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
          items={items}
          index={cinemaIndex}
          onIndexChange={(i) => {
            setCinemaIndex(i);
            lastShotIdRef.current = items[i]?.id ?? null;
          }}
          onClose={() => setCinemaIndex(null)}
          onOpenMark={(id) => {
            setCinemaIndex(null);
            setMetaShotId(id);
            lastShotIdRef.current = id;
          }}
        />
      ) : null}

      <MosaicGrid
        items={items}
        density="studio"
        layout={viewLayout}
        onItemClick={(item) => {
          if (pending) return;
          lastShotIdRef.current = item.id;
          if (selectMode) {
            toggle(item.id);
            return;
          }
          setMetaShotId(item.id);
        }}
        itemClassName={() => "cursor-pointer"}
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
              <div className="absolute inset-0">{image}</div>
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

      {metaShot ? (
        <ShotStudioMetaPanel
          projectId={projectId}
          shotId={metaShot.id}
          filename={metaShot.alt}
          initialNote={metaShot.studio_note}
          initialFlag={metaShot.studio_flag}
          positionLabel={`${items.findIndex((i) => i.id === metaShot.id) + 1} / ${items.length}`}
          onNavigate={navigateMeta}
          onClose={() => setMetaShotId(null)}
          onSaved={({ note, flag }) => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === metaShot.id
                  ? { ...i, studio_note: note, studio_flag: flag }
                  : i
              )
            );
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
