"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
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
  const [busy, setBusy] = useState<"zip" | "list" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function exportList() {
    if (!shots.length) return;
    setError(null);
    setBusy("list");

    const lines = [
      `# Pofo proofing — ${projectTitle}`,
      `# ${shots.length} photos`,
      `# exported ${new Date().toISOString()}`,
      "",
      ...shots.map((s, i) => {
        const ref = s.storage_key || shotDisplayUrl(s) || "";
        return `${i + 1}\t${s.filename ?? s.id}\t${ref}`;
      }),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${projectTitle.replace(/[^\w.-]+/g, "_").slice(0, 40) || "gallery"}-proofing.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(null);
  }

  async function exportZip() {
    if (!shots.length) return;
    setError(null);
    setProgress(null);
    setBusy("zip");

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
      setBusy(null);
      return;
    }

    try {
      await downloadProofingZip(projectTitle, files, (done, total) => {
        setProgress(`${done}/${total}`);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP download failed.");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  const disabled = !shots.length || busy !== null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          disabled={disabled}
          onClick={() => void exportZip()}
          title={
            shots.length
              ? "Download proofed photos as ZIP"
              : "No proofing yet"
          }
        >
          {busy === "zip" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {busy === "zip"
            ? progress
              ? `Zipping ${progress}`
              : "Preparing…"
            : "Download ZIP"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={disabled}
          onClick={exportList}
          title="Download filename list (.txt)"
        >
          {busy === "list" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="mr-1.5 h-3.5 w-3.5" />
          )}
          List
        </Button>
      </div>
      {error ? (
        <p className="max-w-[16rem] text-right text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
