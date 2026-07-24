"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  Download,
  Heart,
  Loader2,
  Lock,
  Square,
  SquaresSubtract,
} from "lucide-react";
import {
  getClientDownloadFiles,
  setClientSelections,
  submitClientProofing,
  toggleClientSelection,
} from "@/actions/share";
import { Logo } from "@/components/brand/logo";
import { MosaicGrid } from "@/components/photo/mosaic-grid";
import { PhotoImage } from "@/components/photo/photo-image";
import { Button } from "@/components/ui/button";
import { downloadPhotosZip } from "@/lib/zip-download";
import { cn } from "@/lib/utils";
import type { ClientGalleryPayload } from "@/types/database";

export function ClientGallery({
  initial,
}: {
  initial: ClientGalleryPayload;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.selected_shot_ids ?? [])
  );
  const [limit] = useState(initial.project.selection_limit);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [bulkMode, setBulkMode] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    initial.project.proofing_completed_at ?? null
  );

  const canDownloadOriginals = Boolean(initial.allow_original_download);
  const originalExpiresLabel = initial.original_expires_at
    ? new Date(initial.original_expires_at).toLocaleDateString()
    : null;

  const shotSrc = (s: (typeof initial.shots)[number]) =>
    s.display_url ?? s.preview_url ?? null;

  // Include pending/raw-only shots (empty src → placeholder tile)
  const gridItems = useMemo(
    () =>
      initial.shots.map((s) => ({
        id: s.id,
        src: shotSrc(s) || "",
        alt: s.filename ?? "Photo",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial.shots]
  );

  const visibleIds = useMemo(
    () => initial.shots.map((s) => s.id),
    [initial.shots]
  );

  const studioLabel =
    initial.studio?.studio_name ||
    initial.studio?.display_name ||
    "Pofo";

  const cover =
    initial.shots.map(shotSrc).find(Boolean) ?? null;

  const count = selected.size;
  const remaining = Math.max(0, limit - count);
  const allMaxed =
    count >= limit ||
    (visibleIds.length > 0 &&
      visibleIds.every((id) => selected.has(id)) &&
      count === Math.min(limit, visibleIds.length));

  const proofLocked =
    initial.project.status === "final" ||
    initial.project.status === "archived";

  const subtitle = useMemo(() => {
    const parts = [initial.project.client_name, initial.project.description]
      .filter(Boolean)
      .join(" · ");
    return parts || "Tap hearts to proof your favorites";
  }, [initial.project]);

  function applyResult(
    res: {
      error?: string;
      selected_shot_ids?: string[];
      selection_limit?: number;
    },
    rollback?: Set<string>
  ) {
    if (res.error === "limit_reached") {
      setMessage(
        `You can proof up to ${res.selection_limit ?? limit} photos.`
      );
      if (rollback) setSelected(rollback);
      // Auto-complete when at limit
      void maybeAutoComplete(limit);
      return;
    }
    if (res.error === "locked") {
      setMessage(
        "Selections are locked — your photographer finalized this gallery."
      );
      if (rollback) setSelected(rollback);
      return;
    }
    if (res.error === "schema_missing") {
      setMessage(
        "Bulk select needs a quick database update — ask your photographer, or pick photos one by one."
      );
      if (rollback) setSelected(rollback);
      return;
    }
    if (res.error) {
      setMessage("Could not update proofing. Try again.");
      if (rollback) setSelected(rollback);
      return;
    }
    const ids = res.selected_shot_ids ?? [];
    setSelected(new Set(ids));
    if (ids.length >= limit && limit > 0) {
      void maybeAutoComplete(limit);
    }
  }

  async function maybeAutoComplete(lim: number) {
    if (completedAt || proofLocked) return;
    // Re-read selection size from latest state is racy; submit with via=limit when at cap
    setCompleteBusy(true);
    try {
      const res = await submitClientProofing({
        token: initial.token,
        via: "limit",
      });
      if (res.ok) {
        setCompletedAt(new Date().toISOString());
        setMessage(
          lim
            ? `You’ve reached your limit of ${lim}. Your photographer has been notified.`
            : "Selection submitted."
        );
      }
    } finally {
      setCompleteBusy(false);
    }
  }

  function onToggle(shotId: string) {
    setMessage(null);
    if (proofLocked) {
      setMessage(
        "Selections are locked — your photographer finalized this gallery."
      );
      return;
    }
    if (completedAt) {
      setMessage(
        "You’ve submitted your selection. Contact your photographer to change picks."
      );
      // Still allow toggles until final lock — product choice: allow edits after complete
      // until project is final. Soft message only.
    }
    const prev = new Set(selected);
    const next = new Set(selected);
    if (next.has(shotId)) {
      next.delete(shotId);
    } else {
      if (next.size >= limit) {
        setMessage(`You can proof up to ${limit} photos.`);
        return;
      }
      next.add(shotId);
    }
    setSelected(next);
    startTransition(async () => {
      const res = await toggleClientSelection(initial.token, shotId);
      applyResult(res, prev);
    });
  }

  function selectUpToLimit() {
    setMessage(null);
    if (proofLocked) return;
    const prev = new Set(selected);
    const next = new Set(selected);
    for (const id of visibleIds) {
      if (next.size >= limit) break;
      next.add(id);
    }
    if (next.size === prev.size) {
      setMessage(
        prev.size >= limit
          ? `Already at your limit of ${limit}.`
          : "All visible photos are already selected."
      );
      return;
    }
    setSelected(next);
    startTransition(async () => {
      const res = await setClientSelections(initial.token, [...next]);
      applyResult(res, prev);
    });
  }

  function clearAll() {
    if (!selected.size || proofLocked) return;
    setMessage(null);
    const prev = new Set(selected);
    setSelected(new Set());
    startTransition(async () => {
      const res = await setClientSelections(initial.token, []);
      applyResult(res, prev);
    });
  }

  async function downloadMyProof() {
    if (!canDownloadOriginals || !selected.size) return;
    setMessage(null);
    setZipBusy(true);
    try {
      const res = await getClientDownloadFiles({
        token: initial.token,
        shotIds: [...selected],
        kind: "jpeg_and_raw",
      });
      if (res.error === "originals_closed") {
        setMessage("Original download window is closed or not enabled.");
        return;
      }
      if (res.error === "expired") {
        setMessage("This link has expired.");
        return;
      }
      if (res.error || !res.files.length) {
        setMessage(
          res.error === "no_selection"
            ? "Select photos first, then download."
            : "No downloadable originals for your selection."
        );
        return;
      }
      await downloadPhotosZip(initial.project.title, res.files, {
        kind: "proofing",
      });
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Download failed. Try again."
      );
    } finally {
      setZipBusy(false);
    }
  }

  async function onMarkComplete() {
    if (!count || proofLocked) return;
    setCompleteBusy(true);
    setMessage(null);
    try {
      const res = await submitClientProofing({
        token: initial.token,
        via: "client",
      });
      if (res.error === "empty") {
        setMessage("Select at least one photo before finishing.");
        return;
      }
      if (res.error === "locked") {
        setMessage("Selections are locked.");
        return;
      }
      if (res.error === "schema_missing") {
        setMessage(
          "Almost there — ask your photographer to enable proofing complete."
        );
        return;
      }
      if (res.error) {
        setMessage("Could not submit. Try again.");
        return;
      }
      setCompletedAt(new Date().toISOString());
      setMessage(
        res.already
          ? "Already submitted — your photographer has your picks."
          : `Done — ${res.selected_count ?? count} photos sent to your photographer.`
      );
    } finally {
      setCompleteBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.01_50)] text-stone-100">
      <header className="relative">
        <div className="relative h-[42vh] min-h-[280px] max-h-[420px]">
          {cover ? (
            <div className="absolute inset-0 client-preview-watermark">
              <PhotoImage
                src={cover}
                alt="Gallery cover"
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-stone-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.01_50)] via-[oklch(0.12_0.01_50_/_0.4)] to-black/20" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-8">
            <Logo className="text-white" markClassName="text-white" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur">
              <Lock className="h-3 w-3" />
              Private preview
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-8">
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">
              Shared with you
            </p>
            <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
              {initial.project.title}
            </h1>
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
            {completedAt ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Selection submitted
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b border-white/5 bg-[oklch(0.12_0.01_50)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-8">
          <p className="text-sm text-stone-400">
            Proof up to <span className="text-stone-200">{limit}</span> photos
            {pending ? (
              <span className="ml-2 text-stone-500">· saving…</span>
            ) : null}
            {bulkMode && remaining > 0 ? (
              <span className="ml-2 text-stone-500">· {remaining} left</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {bulkMode ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-stone-300 hover:bg-white/10 hover:text-white"
                  disabled={pending || allMaxed || proofLocked}
                  onClick={selectUpToLimit}
                  title={`Select up to ${limit} photos`}
                >
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  Select all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-stone-300 hover:bg-white/10 hover:text-white"
                  disabled={pending || count === 0 || proofLocked}
                  onClick={clearAll}
                >
                  <SquaresSubtract className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent text-stone-200 hover:bg-white/10"
                  disabled={pending}
                  onClick={() => setBulkMode(false)}
                >
                  Done
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-white/20 bg-transparent text-stone-200 hover:bg-white/10"
                disabled={pending || visibleIds.length === 0 || proofLocked}
                onClick={() => {
                  setBulkMode(true);
                  setMessage(null);
                }}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Bulk select
              </Button>
            )}
            {canDownloadOriginals ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-white/20 bg-transparent text-stone-200 hover:bg-white/10"
                disabled={zipBusy || count === 0 || pending}
                onClick={() => void downloadMyProof()}
                title={
                  originalExpiresLabel
                    ? `Download originals / RAW (until ${originalExpiresLabel})`
                    : "Download JPEG + RAW for your picks"
                }
              >
                {zipBusy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Download
              </Button>
            ) : null}
            {!proofLocked ? (
              <Button
                type="button"
                size="sm"
                className={cn(
                  "rounded-full",
                  completedAt
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "bg-white text-stone-900 hover:bg-stone-200"
                )}
                disabled={
                  completeBusy || pending || count === 0 || Boolean(completedAt)
                }
                onClick={() => void onMarkComplete()}
              >
                {completeBusy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : completedAt ? (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                {completedAt ? "Submitted" : "I’m done selecting"}
              </Button>
            ) : null}
            <Button
              size="sm"
              className="rounded-full bg-white/10 text-white hover:bg-white/15"
            >
              <Heart
                className={cn(
                  "mr-1.5 h-3.5 w-3.5",
                  count > 0 && "fill-white"
                )}
              />
              {count} / {limit}
            </Button>
          </div>
        </div>
        {message ? (
          <p className="border-t border-white/5 px-4 py-2 text-center text-xs text-amber-200/90 sm:px-8">
            {message}
          </p>
        ) : null}
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {gridItems.length === 0 ? (
          <p className="py-16 text-center text-sm text-stone-500">
            No photos in this gallery yet.
          </p>
        ) : (
          <MosaicGrid
            items={gridItems}
            density="client"
            onItemClick={(item) => onToggle(item.id)}
            renderTile={({ item, image }) => {
              const isOn = selected.has(item.id);
              const hasSrc = Boolean(item.src);
              return (
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={cn(
                    "group relative h-full w-full overflow-hidden rounded-md bg-stone-900 text-left",
                    isOn && "ring-2 ring-white ring-offset-2 ring-offset-[oklch(0.12_0.01_50)]"
                  )}
                >
                  {hasSrc ? (
                    <div className="client-preview-watermark h-full w-full">
                      {image}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[8rem] items-center justify-center bg-stone-800/80 px-2 text-center text-[11px] text-stone-400">
                      Preview pending
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition",
                      isOn
                        ? "bg-white text-rose-600"
                        : "bg-black/40 text-white/90 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Heart
                      className={cn("h-3.5 w-3.5", isOn && "fill-rose-600")}
                    />
                  </span>
                </button>
              );
            }}
          />
        )}
        <p className="mt-10 text-center text-xs text-stone-600">
          Shared by {studioLabel} · Pofo
        </p>
      </main>
    </div>
  );
}
