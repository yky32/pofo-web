"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { updateProjectStatus } from "@/actions/shots";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/database";

/** Match GalleryStatusBadge — solid, readable chips */
const STATUSES: {
  value: ProjectStatus;
  label: string;
  hint: string;
  chip: string;
}[] = [
  {
    value: "draft",
    label: "Draft",
    hint: "Not shared yet",
    chip: "bg-stone-600 text-white",
  },
  {
    value: "shared",
    label: "Shared",
    hint: "Link sent to client",
    chip: "bg-sky-600 text-white",
  },
  {
    value: "proofing",
    label: "Proofing",
    hint: "Client selecting",
    chip: "bg-amber-500 text-amber-950",
  },
  {
    value: "final",
    label: "Final",
    hint: "Delivery complete",
    chip: "bg-emerald-600 text-white",
  },
  {
    value: "archived",
    label: "Archived",
    hint: "Hidden from active",
    chip: "bg-stone-400 text-white",
  },
];

/**
 * Free status control — photographer can jump to any status anytime.
 * Menu is portaled so it never sits under the contact sheet.
 */
export function ProjectStatusControl({
  projectId,
  status,
  className,
}: {
  projectId: string;
  status: ProjectStatus;
  className?: string;
}) {
  const router = useRouter();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 8;
      const margin = 8;
      // ~5 rows × ~44px
      const menuH = 240;
      const right = Math.max(margin, window.innerWidth - r.right);
      const spaceBelow = window.innerHeight - r.bottom - gap - margin;
      const spaceAbove = r.top - gap - margin;
      const openBelow =
        spaceBelow >= menuH || spaceBelow >= spaceAbove || spaceAbove < 120;

      if (openBelow) {
        setPos({
          top: r.bottom + gap,
          bottom: undefined,
          right,
          maxHeight: Math.max(160, Math.min(spaceBelow, window.innerHeight * 0.7)),
        });
      } else {
        setPos({
          top: undefined,
          bottom: window.innerHeight - r.top + gap,
          right,
          maxHeight: Math.max(160, Math.min(spaceAbove, window.innerHeight * 0.7)),
        });
      }
    }

    place();
    const raf = requestAnimationFrame(() => {
      place();
      requestAnimationFrame(place);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  function setStatus(next: ProjectStatus) {
    if (next === status) {
      setOpen(false);
      return;
    }
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const res = await updateProjectStatus({
        projectId,
        status: next,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        id={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-2.5 text-xs font-medium shadow-sm transition",
          "hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
          open && "ring-2 ring-stone-300",
          pending && "opacity-60"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${menuId}-list` : undefined}
      >
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
            current.chip
          )}
        >
          {current.label}
        </span>
        <span className="hidden text-stone-500 sm:inline">Status</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-stone-400 transition",
            open && "rotate-180"
          )}
        />
      </button>

      {mounted && open && pos
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[200]"
                aria-hidden
                onClick={() => setOpen(false)}
              />
              <ul
                ref={panelRef}
                id={`${menuId}-list`}
                role="listbox"
                aria-labelledby={menuId}
                style={{
                  top: pos.top,
                  bottom: pos.bottom,
                  right: pos.right,
                  maxHeight: pos.maxHeight,
                }}
                className={cn(
                  "fixed z-[201] w-56 overflow-y-auto overscroll-contain rounded-xl border border-stone-200/90 bg-white py-1 shadow-xl",
                  "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
              >
                {STATUSES.map((s) => {
                  const active = s.value === status;
                  return (
                    <li key={s.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        disabled={pending}
                        onClick={() => setStatus(s.value)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2.5 text-left transition",
                          active ? "bg-stone-50" : "hover:bg-stone-50"
                        )}
                      >
                        <span
                          className={cn(
                            "min-w-[4.75rem] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold",
                            s.chip
                          )}
                        >
                          {s.label}
                        </span>
                        <span className="min-w-0 flex-1 text-[11px] leading-snug text-stone-500">
                          {s.hint}
                        </span>
                        {active ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-stone-800" />
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>,
            document.body
          )
        : null}

      {error ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
