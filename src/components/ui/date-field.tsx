"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function parseYmd(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0);
}

function formatDisplay(ymd: string | null): string | null {
  const d = parseYmd(ymd);
  if (!d) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type DateFieldProps = {
  id?: string;
  name?: string;
  /** YYYY-MM-DD */
  defaultValue?: string;
  /** Controlled YYYY-MM-DD (optional) */
  value?: string;
  onChange?: (ymd: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Light form field vs dark hero glass */
  variant?: "default" | "hero";
};

/**
 * Brand date field — stone/glass calendar popover.
 * Avoids the OS-native blue picker so Memories dates feel like Pofo.
 */
export function DateField({
  id,
  name,
  defaultValue = "",
  value: valueProp,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  variant = "default",
}: DateFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const panelId = `${fieldId}-panel`;
  const isHero = variant === "hero";

  const [uncontrolled, setUncontrolled] = useState(
    () => defaultValue?.slice(0, 10) ?? ""
  );
  const selectedYmd = valueProp !== undefined ? valueProp : uncontrolled;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState(() => {
    const d = parseYmd(selectedYmd) ?? new Date();
    return startOfMonth(d);
  });
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [onChange, valueProp]
  );

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const margin = 8;
    const panelH = 340;
    const panelW = Math.max(280, Math.min(r.width, 320));
    const spaceBelow = window.innerHeight - r.bottom - gap - margin;
    const spaceAbove = r.top - gap - margin;
    const openBelow =
      spaceBelow >= panelH || spaceBelow >= spaceAbove || spaceAbove < 160;

    let left = r.left;
    if (left + panelW > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - panelW);
    }
    left = Math.max(margin, left);

    if (openBelow) {
      setPos({
        top: r.bottom + gap,
        bottom: undefined,
        left,
        width: panelW,
      });
    } else {
      setPos({
        top: undefined,
        bottom: window.innerHeight - r.top + gap,
        left,
        width: panelW,
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  // Sync view month when value changes externally
  useEffect(() => {
    const d = parseYmd(selectedYmd);
    if (d) setView(startOfMonth(d));
  }, [selectedYmd]);

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1, 12, 0, 0);
    const startPad = first.getDay(); // Sun = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const out: {
      date: Date;
      ymd: string;
      inMonth: boolean;
    }[] = [];

    for (let i = 0; i < startPad; i++) {
      const day = prevDays - startPad + 1 + i;
      const date = new Date(year, month - 1, day, 12, 0, 0);
      out.push({ date, ymd: toYmd(date), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day, 12, 0, 0);
      out.push({ date, ymd: toYmd(date), inMonth: true });
    }
    while (out.length % 7 !== 0 || out.length < 42) {
      const last = out[out.length - 1]!.date;
      const date = new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate() + 1,
        12,
        0,
        0
      );
      out.push({ date, ymd: toYmd(date), inMonth: false });
    }
    return out;
  }, [view]);

  const selected = parseYmd(selectedYmd);
  const today = new Date();
  const label = formatDisplay(selectedYmd || null);

  function pick(ymd: string) {
    setValue(ymd);
    setOpen(false);
  }

  function clear() {
    setValue("");
    setOpen(false);
  }

  function goToday() {
    const ymd = toYmd(new Date());
    setValue(ymd);
    setView(startOfMonth(new Date()));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1, 12, 0, 0));
  }

  const panel =
    open && mounted && pos
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Choose event date"
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              zIndex: 260,
            }}
            className={cn(
              "rounded-2xl border p-3 shadow-2xl",
              "animate-in fade-in-0 zoom-in-95 duration-150",
              isHero
                ? "border-white/15 bg-stone-950/90 text-white backdrop-blur-xl"
                : "border-stone-200/80 bg-white/95 text-stone-900 backdrop-blur-xl"
            )}
          >
            {/* Month nav */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <p
                className={cn(
                  "font-heading text-base tracking-tight",
                  isHero ? "text-white" : "text-stone-900"
                )}
              >
                {MONTHS[view.getMonth()]} {view.getFullYear()}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition",
                    isHero
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Next month"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition",
                    isHero
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  )}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className={cn(
                    "py-1 text-center text-[10px] font-medium uppercase tracking-wider",
                    isHero ? "text-white/40" : "text-stone-400"
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell) => {
                const isSelected = selected ? sameDay(cell.date, selected) : false;
                const isToday = sameDay(cell.date, today);
                return (
                  <button
                    key={cell.ymd + (cell.inMonth ? "" : "-o")}
                    type="button"
                    onClick={() => pick(cell.ymd)}
                    className={cn(
                      "relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition",
                      !cell.inMonth &&
                        (isHero ? "text-white/25" : "text-stone-300"),
                      cell.inMonth &&
                        !isSelected &&
                        (isHero
                          ? "text-white/85 hover:bg-white/10"
                          : "text-stone-800 hover:bg-stone-100"),
                      isToday &&
                        !isSelected &&
                        (isHero
                          ? "ring-1 ring-white/35"
                          : "ring-1 ring-stone-300"),
                      isSelected &&
                        (isHero
                          ? "bg-white font-medium text-stone-900 shadow-sm"
                          : "bg-stone-900 font-medium text-white shadow-sm")
                    )}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className={cn(
                "mt-3 flex items-center justify-between border-t pt-2.5",
                isHero ? "border-white/10" : "border-stone-100"
              )}
            >
              <button
                type="button"
                onClick={clear}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  isHero
                    ? "text-white/55 hover:bg-white/10 hover:text-white"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                )}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={goToday}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  isHero
                    ? "text-white/80 hover:bg-white/10 hover:text-white"
                    : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                )}
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={selectedYmd} />
      ) : null}
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm shadow-xs transition outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isHero
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-input bg-white/80 text-stone-800 hover:bg-white",
          open &&
            (isHero
              ? "border-white/35 ring-2 ring-white/15"
              : "border-stone-300 ring-2 ring-stone-200/80")
        )}
      >
        <Calendar
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isHero ? "text-white/55" : "text-stone-400"
          )}
          strokeWidth={1.75}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !label && (isHero ? "text-white/40" : "text-stone-400")
          )}
        >
          {label ?? placeholder}
        </span>
      </button>
      {panel}
    </div>
  );
}
