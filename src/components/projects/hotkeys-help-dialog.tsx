"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type HotkeyRow = {
  keys: string[];
  action: string;
};

export type HotkeySection = {
  title: string;
  rows: HotkeyRow[];
};

/** Canonical photographer contact-sheet shortcuts */
export const CONTACT_SHEET_HOTKEYS: HotkeySection[] = [
  {
    title: "Cinema + studio (layout, no pop-up)",
    rows: [
      { keys: ["C"], action: "Enter Cinema (photo-first full view)" },
      { keys: ["Click"], action: "Open photo in Cinema" },
      { keys: ["←", "→"], action: "Previous / next photo" },
      { keys: ["1"], action: "Flag · None" },
      { keys: ["2"], action: "Flag · Print" },
      { keys: ["3"], action: "Flag · Retouch" },
      { keys: ["4"], action: "Flag · Hero" },
      { keys: ["5"], action: "Flag · Reject" },
      { keys: ["N"], action: "Expand note on floating studio card" },
      { keys: ["⌘", "Enter"], action: "Save note (Ctrl+Enter on Windows)" },
      { keys: ["Esc"], action: "Exit cinema / hotkeys · exit Select" },
      { keys: ["?"], action: "Show this hotkeys menu" },
    ],
  },
  {
    title: "Select mode",
    rows: [
      { keys: ["S"], action: "Enter / exit Select mode" },
      { keys: ["A"], action: "Select all / deselect all" },
      { keys: ["Space"], action: "Toggle select on focused / last opened" },
      { keys: ["Delete"], action: "Delete selected (confirm)" },
      { keys: ["D"], action: "Delete selected (confirm)" },
    ],
  },
  {
    title: "Layout",
    rows: [
      {
        keys: ["Grid icon"],
        action: "Mosaic · Square · Dense · Large",
      },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.5rem] items-center justify-center rounded-md px-1.5 py-0.5",
        "border border-stone-200/80 bg-white/90 text-[11px] font-medium text-stone-800 shadow-sm",
        "font-mono"
      )}
    >
      {children}
    </kbd>
  );
}

/**
 * Centered glass cheatsheet — same blur as Client links / account menu.
 */
export function HotkeysHelpDialog({
  open,
  onClose,
  sections = CONTACT_SHEET_HOTKEYS,
  title = "Keyboard shortcuts",
  subtitle = "Speed through cull, mark, and select",
}: {
  open: boolean;
  onClose: () => void;
  sections?: HotkeySection[];
  title?: string;
  subtitle?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        className="dialog-glass-overlay fixed inset-0 z-[300]"
        aria-label="Close hotkeys"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotkeys-help-title"
        className={cn(
          "dialog-glass-panel fixed left-1/2 top-1/2 z-[301] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2",
          "max-h-[min(85vh,32rem)] overflow-y-auto overscroll-contain rounded-2xl p-0",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-stone-900/5 bg-white/50 px-4 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
              <h2
                id="hotkeys-help-title"
                className="font-heading text-lg font-medium text-stone-900"
              >
                {title}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-900/5 hover:text-stone-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-3.5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                {section.title}
              </p>
              <ul className="space-y-1.5">
                {section.rows.map((row) => (
                  <li
                    key={`${section.title}-${row.action}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"
                  >
                    <span className="min-w-0 text-xs leading-snug text-stone-600">
                      {row.action}
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {row.keys.map((k, i) => (
                        <span key={`${k}-${i}`} className="flex items-center gap-1">
                          {i > 0 ? (
                            <span className="text-[10px] text-stone-400">/</span>
                          ) : null}
                          <KeyCap>{k}</KeyCap>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="border-t border-stone-900/5 pt-3 text-[11px] leading-relaxed text-stone-400">
            Shortcuts work on the contact sheet. Type in a note field won’t
            trigger letter keys (except when focusing with{" "}
            <KeyCap>N</KeyCap>).
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}

/** Circular help trigger — matches other toolbar icons */
export function HotkeysHelpButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Keyboard shortcuts (?)"
      aria-label="Keyboard shortcuts"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm transition",
        "hover:bg-stone-50 hover:text-stone-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
        className
      )}
    >
      <Keyboard className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}
