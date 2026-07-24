"use client";

import { useState } from "react";
import {
  ChevronDown,
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPhotosZip } from "@/lib/zip-download";
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

/**
 * Photographer download menu:
 * - Full / proof ZIP (web previews — fast retouch handoff)
 * - Originals + RAW (signed storage keys — full quality)
 * - Proof filename list for Lightroom
 */
export function ExportSelectionButton({
  projectId,
  projectTitle,
  allShots,
  proofedShots,
}: {
  projectId: string;
  projectTitle: string;
  /** All gallery photos (signed display URLs) */
  allShots: Shot[];
  /** Client-selected / proofed photos */
  proofedShots: Shot[];
}) {
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

  /** Fast path: use already-signed display URLs (previews) */
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

  /** Originals / RAW via server-signed storage keys */
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

  const isBusy = busy !== null;
  const hasAny = allShots.length > 0;

  const buttonLabel = isBusy
    ? progress
      ? `Zipping ${progress}`
      : "Preparing…"
    : "Download";

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!hasAny || isBusy}
          render={
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
              disabled={!hasAny || isBusy}
              title="Download photos as ZIP"
            />
          }
        >
          {isBusy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {buttonLabel}
          {!isBusy ? (
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[17rem]">
          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || fullCount === 0}
            onClick={() =>
              void runPreviewZip(
                "full",
                allShots,
                "No photos in this gallery yet."
              )
            }
          >
            <Images className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">Full gallery</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                Web previews · all {fullCount} photo
                {fullCount === 1 ? "" : "s"}
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || proofCount === 0}
            onClick={() =>
              void runPreviewZip(
                "proofing",
                proofedShots,
                "Client hasn’t finished proofing yet."
              )
            }
          >
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">
                Client’s finished proof
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {proofCount > 0
                  ? `Previews · ${proofCount} hearted`
                  : "No proofing picks yet"}
              </span>
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || fullCount === 0}
            onClick={() =>
              void runAssetZip(
                "originals",
                undefined,
                "originals",
                "No original JPEGs available."
              )
            }
          >
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">Original JPEGs</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                Full-res originals (not web previews)
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || !hasRaw}
            onClick={() =>
              void runAssetZip(
                "raw",
                undefined,
                "raw",
                "No RAW files in this gallery yet."
              )
            }
          >
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">RAW files</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {hasRaw
                  ? "All RAW / paired companions"
                  : "Upload RAW or JPEG+RAW pairs first"}
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || proofCount === 0}
            onClick={() =>
              void runAssetZip(
                "proof-originals-raw",
                proofedShots.map((s) => s.id),
                "originals_and_raw",
                "No originals for proofed shots."
              )
            }
          >
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">Proof originals + RAW</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {proofCount > 0
                  ? `Hearted set · JPEG${proofHasRaw ? " + RAW" : ""}`
                  : "No proofing picks yet"}
              </span>
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || proofCount === 0}
            onClick={() => downloadFilenameList(proofedShots, "proofing")}
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">Proof filename list</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                .txt for Lightroom / Finder filter
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p className="max-w-[17rem] text-right text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
