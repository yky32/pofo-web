"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadProofingZip } from "@/lib/zip-download";
import { shotDisplayUrl, type Shot } from "@/types/database";

export function ExportSelectionButton({
  projectTitle,
  shots,
}: {
  projectTitle: string;
  shots: Shot[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function exportZip() {
    if (!shots.length) return;
    setError(null);
    setProgress(null);
    setBusy(true);

    const files = shots
      .map((s) => {
        const url = shotDisplayUrl(s);
        if (!url) return null;
        return {
          filename: s.filename ?? `${s.id}.jpg`,
          url,
        };
      })
      .filter((f): f is { filename: string; url: string } => Boolean(f));

    if (!files.length) {
      setError("No downloadable photo URLs. Refresh and try again.");
      setBusy(false);
      return;
    }

    try {
      await downloadProofingZip(projectTitle, files, (done, total) => {
        setProgress(`${done}/${total}`);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP download failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
        disabled={!shots.length || busy}
        onClick={() => void exportZip()}
        title={
          shots.length
            ? "Download proofed photos as ZIP"
            : "No proofing yet"
        }
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {busy
          ? progress
            ? `Zipping ${progress}`
            : "Preparing…"
          : "Download ZIP"}
      </Button>
      {error ? (
        <p className="max-w-[16rem] text-right text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
