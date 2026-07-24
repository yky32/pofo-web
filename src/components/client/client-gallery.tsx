"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  Download,
  Heart,
  Loader2,
  Lock,
  Square,
  SquaresSubtract,
} from "lucide-react";
import {
  setClientSelections,
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
  /** Multi-select mode: checkmarks always visible, bulk toolbar active */
  const [bulkMode, setBulkMode] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);

  const canDownloadOriginals = Boolean(initial.allow_original_download);
  const originalExpiresLabel = initial.original_expires_at
    ? new Date(initial.original_expires_at).toLocaleDateString()
    : null;

  const shotSrc = (s: (typeof initial.shots)[number]) =>
    s.display_url ?? s.preview_url ?? null;

  const visibleIds = useMemo(
    () =>
      initial.shots
        .filter((s) => Boolean(shotSrc(s)))
        .map((s) => s.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shotSrc is pure over shot fields
    [initial.shots]
  );

  const studioLabel =
    initial.studio?.studio_name ||
    initial.studio?.display_name ||
    "Pofo";

  const cover =
    initial.shots.map(shotSrc).find(Boolean) ?? null;

  const count = selected.size;
  const atLimit = count >= limit;
  const remaining = Math.max(0, limit - count);
  const allMaxed =
    count >= limit ||
    (visibleIds.length > 0 &&
      visibleIds.every((id) => selected.has(id)) &&
      count === Math.min(limit, visibleIds.length));

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
    setSelected(new Set(res.selected_shot_ids ?? []));
  }

  const proofLocked =
    initial.project.status === "final" ||
    initial.project.status === "archived";

  function onToggle(shotId: string) {
    setMessage(null);
    if (proofLocked) {
      setMessage(
        "Selections are locked — your photographer finalized this gallery."
      );
      return;
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
    // Optimistic
    setSelected(next);
    startTransition(async () => {
      const res = await toggleClientSelection(initial.token, shotId);
      applyResult(res, prev);
    });
  }

  function selectUpToLimit() {
    setMessage(null);
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
    if (!selected.size) return;
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
      const files = initial.shots
        .filter((s) => selected.has(s.id))
        .map((s) => {
          const url = shotSrc(s);
          if (!url) return null;
          return {
            filename: s.filename ?? `${s.id}.jpg`,
            url,
          };
        })
        .filter((f): f is { filename: string; url: string } => Boolean(f));

      if (!files.length) {
        setMessage("No downloadable photos. Try again later.");
        return;
      }
      await downloadPhotosZip(initial.project.title, files, {
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
              <span className="ml-2 text-stone-500">
                · {remaining} left
              </span>
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
                  disabled={pending || allMaxed}
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
                  disabled={pending || count === 0}
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
                disabled={pending || visibleIds.length === 0}
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
                    ? `Download your proofed photos (until ${originalExpiresLabel})`
                    : "Download your proofed photos"
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
            <Button
              size="sm"
              className="rounded-full bg-white text-stone-900 hover:bg-stone-200"
            >
              <Heart
                className={cn(
                  "mr-1.5 h-3.5 w-3.5",
                  count > 0 && "fill-stone-900"
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
        {bulkMode ? (
          <p className="border-t border-white/5 px-4 py-2 text-center text-[11px] text-stone-500 sm:px-8">
            Tap photos to add or remove · Select all fills up to your limit
            {atLimit ? " · limit reached" : ""}
          </p>
        ) : null}
      </div>

      <main className="mx-auto max-w-6xl px-2 py-6 sm:px-4 sm:py-8">
        {initial.shots.length === 0 ? (
          <p className="py-16 text-center text-sm text-stone-500">
            No photos in this gallery yet.
          </p>
        ) : (
          <MosaicGrid
            density="client"
            items={initial.shots
              .map((shot, i) => {
                const src = shotSrc(shot);
                if (!src) return null;
                return {
                  id: shot.id,
                  src,
                  alt: shot.filename ?? `Photo ${i + 1}`,
                };
              })
              .filter((x): x is { id: string; src: string; alt: string } =>
                Boolean(x)
              )}
            onItemClick={(item) => {
              if (!pending) onToggle(item.id);
            }}
            itemClassName={({ item }) =>
              cn(
                pending && "pointer-events-none opacity-80",
                bulkMode && selected.has(item.id) && "ring-2 ring-white ring-offset-2 ring-offset-[oklch(0.12_0.01_50)]"
              )
            }
            renderTile={({ item, image }) => {
              const isOn = selected.has(item.id);
              return (
                <>
                  <div className="client-preview-watermark absolute inset-0">
                    {image}
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 transition",
                      isOn
                        ? "bg-black/25"
                        : "bg-black/0 group-hover:bg-black/15"
                    )}
                  />
                  {bulkMode ? (
                    <span
                      className={cn(
                        "absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border shadow transition",
                        isOn
                          ? "border-white bg-white text-rose-600"
                          : "border-white/70 bg-black/35 text-transparent backdrop-blur-sm"
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition",
                      isOn
                        ? "bg-white text-rose-600 opacity-100"
                        : bulkMode
                          ? "bg-white/80 text-stone-800 opacity-70"
                          : "bg-white/90 text-stone-800 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Heart
                      className={cn("h-3.5 w-3.5", isOn && "fill-rose-600")}
                    />
                  </span>
                </>
              );
            }}
          />
        )}

        <p className="mt-10 text-center text-xs text-stone-600">
          Preview for proofing · delivered by {studioLabel} · Pofo
        </p>
      </main>
    </div>
  );
}
