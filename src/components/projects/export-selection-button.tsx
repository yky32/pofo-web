"use client";

import { useState } from "react";
import { ChevronDown, Download, Heart, Images, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPhotosZip } from "@/lib/zip-download";
import { shotDisplayUrl, type Shot } from "@/types/database";

function shotsToFiles(shots: Shot[]) {
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
 * - Full gallery ZIP (every photo in the project)
 * - Client finished proof ZIP (only hearts the client picked)
 */
export function ExportSelectionButton({
  projectTitle,
  allShots,
  proofedShots,
}: {
  projectTitle: string;
  /** All gallery photos (signed display URLs) */
  allShots: Shot[];
  /** Client-selected / proofed photos */
  proofedShots: Shot[];
}) {
  const [busy, setBusy] = useState<"full" | "proofing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function runZip(
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

    const files = shotsToFiles(shots);
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

  const isBusy = busy !== null;
  const hasAny = allShots.length > 0;
  const proofCount = proofedShots.length;
  const fullCount = allShots.length;

  const label = isBusy
    ? progress
      ? `Zipping ${progress}`
      : "Preparing…"
    : "Download";

  return (
    <div className="flex flex-col items-end gap-1">
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
          {label}
          {!isBusy ? <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" /> : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[16rem]">
          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || fullCount === 0}
            onClick={() =>
              void runZip(
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
                Download all {fullCount} photo
                {fullCount === 1 ? "" : "s"} as a ZIP
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="items-start py-2"
            disabled={isBusy || proofCount === 0}
            onClick={() =>
              void runZip(
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
                  ? `Only the ${proofCount} photo${proofCount === 1 ? "" : "s"} they hearted`
                  : "No proofing picks yet"}
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p className="max-w-[16rem] text-right text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
