"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  FileText,
  HardDrive,
  Heart,
  Images,
  Loader2,
} from "lucide-react";
import {
  getPhotographerDownloadFiles,
  type PhotographerDownloadKind,
} from "@/actions/shots";
import { downloadPhotosZip } from "@/lib/zip-download";
import { cn } from "@/lib/utils";
import { shotDisplayUrl, type Shot } from "@/types/database";

function shotsToPreviewFiles(shots: Shot[]) {
  return shots
    .map((s) => {
      const url = shotDisplayUrl(s);
      if (!url) return null;
      return {
        filename: s.filename ?? `${s.id}.jpg`,
        url,
      };
    })
    .filter((f): f is { filename: string; url: string } => Boolean(f));
}

type MenuItem = {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  separatorBefore?: boolean;
};

/**
 * Photographer download menu — same glass overlay as Client links.
 */
export function ExportSelectionButton({
  projectId,
  projectTitle,
  allShots,
  proofedShots,
}: {
  projectId: string;
  projectTitle: string;
  allShots: Shot[];
  proofedShots: Shot[];
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
  } | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const proofCount = proofedShots.length;
  const fullCount = allShots.length;
  const hasRaw = allShots.some(
    (s) => s.kind === "raw" || s.kind === "paired" || Boolean(s.raw_key)
  );
  const proofHasRaw = proofedShots.some(
    (s) => s.kind === "raw" || s.kind === "paired" || Boolean(s.raw_key)
  );
  const isBusy = busy !== null;
  const hasAny = allShots.length > 0;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 8;
      const margin = 8;
      const right = Math.max(margin, window.innerWidth - r.right);
      const spaceBelow = window.innerHeight - r.bottom - gap - margin;
      const spaceAbove = r.top - gap - margin;
      const openBelow =
        spaceBelow >= 280 || spaceBelow >= spaceAbove || spaceAbove < 160;

      if (openBelow) {
        setPos({
          top: r.bottom + gap,
          bottom: undefined,
          right,
          maxHeight: Math.max(180, Math.min(spaceBelow, window.innerHeight * 0.85)),
        });
      } else {
        setPos({
          top: undefined,
          bottom: window.innerHeight - r.top + gap,
          right,
          maxHeight: Math.max(180, Math.min(spaceAbove, window.innerHeight * 0.85)),
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

  function closeThen(fn: () => void) {
    setOpen(false);
    fn();
  }

  function downloadFilenameList(shots: Shot[], kind: "proofing" | "full") {
    if (!shots.length) {
      setError(
        kind === "proofing"
          ? "Client hasn’t finished proofing yet."
          : "No photos in this gallery yet."
      );
      return;
    }
    setError(null);
    setBusy("list");
    try {
      const lines = shots
        .map((s) => s.filename?.trim())
        .filter((n): n is string => Boolean(n));
      const body = lines.length
        ? lines.join("\n") + "\n"
        : shots.map((s) => s.id).join("\n") + "\n";
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      const safe =
        projectTitle.replace(/[^\w.-]+/g, "_").slice(0, 48) || "gallery";
      a.href = URL.createObjectURL(blob);
      a.download =
        kind === "proofing"
          ? `${safe}-proof-filenames.txt`
          : `${safe}-filenames.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(null);
    }
  }

  async function runPreviewZip(
    kind: "full" | "proofing",
    shots: Shot[],
    emptyMessage: string
  ) {
    if (!shots.length) {
      setError(emptyMessage);
      return;
    }
    setError(null);
    setProgress(null);
    setBusy(kind);

    const files = shotsToPreviewFiles(shots);
    if (!files.length) {
      setError("No downloadable photo URLs. Refresh and try again.");
      setBusy(null);
      return;
    }

    try {
      await downloadPhotosZip(projectTitle, files, {
        kind,
        onProgress: (done, total) => setProgress(`${done}/${total}`),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP download failed.");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function runAssetZip(
    label: string,
    shotIds: string[] | undefined,
    kind: PhotographerDownloadKind,
    emptyMessage: string
  ) {
    setError(null);
    setProgress(null);
    setBusy(label);

    try {
      const res = await getPhotographerDownloadFiles({
        projectId,
        shotIds,
        kind,
      });
      if (res.error || !res.files.length) {
        setError(res.error || emptyMessage);
        return;
      }
      await downloadPhotosZip(projectTitle, res.files, {
        kind: label,
        onProgress: (done, total) => setProgress(`${done}/${total}`),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP download failed.");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  const items: MenuItem[] = [
    {
      key: "full",
      label: "Full gallery",
      hint: `Web previews · all ${fullCount} photo${fullCount === 1 ? "" : "s"}`,
      icon: <Images className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />,
      disabled: isBusy || fullCount === 0,
      onClick: () =>
        closeThen(() =>
          void runPreviewZip("full", allShots, "No photos in this gallery yet.")
        ),
    },
    {
      key: "proof",
      label: "Client’s finished proof",
      hint:
        proofCount > 0
          ? `Previews · ${proofCount} hearted`
          : "No proofing picks yet",
      icon: <Heart className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />,
      disabled: isBusy || proofCount === 0,
      onClick: () =>
        closeThen(() =>
          void runPreviewZip(
            "proofing",
            proofedShots,
            "Client hasn’t finished proofing yet."
          )
        ),
    },
    {
      key: "originals",
      label: "Original JPEGs",
      hint: "Full-res originals (not web previews)",
      icon: <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />,
      disabled: isBusy || fullCount === 0,
      separatorBefore: true,
      onClick: () =>
        closeThen(() =>
          void runAssetZip(
            "originals",
            undefined,
            "originals",
            "No original JPEGs available."
          )
        ),
    },
    {
      key: "raw",
      label: "RAW files",
      hint: hasRaw
        ? "All RAW / paired companions"
        : "Upload RAW or JPEG+RAW pairs first",
      icon: <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />,
      disabled: isBusy || !hasRaw,
      onClick: () =>
        closeThen(() =>
          void runAssetZip(
            "raw",
            undefined,
            "raw",
            "No RAW files in this gallery yet."
          )
        ),
    },
    {
      key: "proof-raw",
      label: "Proof originals + RAW",
      hint:
        proofCount > 0
          ? `Hearted set · JPEG${proofHasRaw ? " + RAW" : ""}`
          : "No proofing picks yet",
      icon: <Heart className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />,
      disabled: isBusy || proofCount === 0,
      onClick: () =>
        closeThen(() =>
          void runAssetZip(
            "proof-originals-raw",
            proofedShots.map((s) => s.id),
            "originals_and_raw",
            "No originals for proofed shots."
          )
        ),
    },
    {
      key: "list",
      label: "Proof filename list",
      hint: ".txt for Lightroom / Finder filter",
      icon: <FileText className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />,
      disabled: isBusy || proofCount === 0,
      separatorBefore: true,
      onClick: () =>
        closeThen(() => downloadFilenameList(proofedShots, "proofing")),
    },
  ];

  const ariaTitle = isBusy
    ? progress
      ? `Zipping ${progress}`
      : "Preparing download…"
    : "Download photos";

  return (
    <div className="relative flex flex-col items-start gap-1 sm:items-end">
      <button
        ref={triggerRef}
        type="button"
        disabled={!hasAny || isBusy}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={ariaTitle}
        title={ariaTitle}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200/90 bg-stone-900 text-stone-50 shadow-sm transition",
          "hover:bg-stone-800",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
          open && "ring-2 ring-stone-300",
          (!hasAny || isBusy) && "opacity-60"
        )}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>

      {mounted && open && pos
        ? createPortal(
            <>
              <div
                className="dialog-glass-overlay fixed inset-0 z-[200]"
                aria-hidden
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                id={menuId}
                role="menu"
                aria-label="Download options"
                style={{
                  top: pos.top,
                  bottom: pos.bottom,
                  right: pos.right,
                  maxHeight: pos.maxHeight,
                }}
                className={cn(
                  "dialog-glass-panel fixed z-[201] w-[min(17.5rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-xl py-1",
                  "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
              >
                {items.map((item) => (
                  <div key={item.key}>
                    {item.separatorBefore ? (
                      <div className="my-1 border-t border-stone-900/8" />
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={item.onClick}
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2.5 text-left transition",
                        item.disabled
                          ? "cursor-not-allowed opacity-45"
                          : "hover:bg-stone-900/5"
                      )}
                    >
                      {item.icon}
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium text-stone-900">
                          {item.label}
                        </span>
                        <span className="text-[11px] leading-snug text-stone-500">
                          {item.hint}
                        </span>
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </>,
            document.body
          )
        : null}

      {error ? (
        <p className="max-w-[17rem] text-right text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
