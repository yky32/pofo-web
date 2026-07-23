"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shotDisplayUrl, type Shot } from "@/types/database";

export function ExportSelectionButton({
  projectTitle,
  shots,
}: {
  projectTitle: string;
  shots: Shot[];
}) {
  function exportList() {
    if (!shots.length) return;

    const lines = [
      `# Pofo proofing — ${projectTitle}`,
      `# ${shots.length} photos`,
      `# exported ${new Date().toISOString()}`,
      "",
      ...shots.map((s, i) => {
        // Prefer stable storage_key over short-lived signed display URLs
        const ref = s.storage_key || shotDisplayUrl(s) || "";
        return `${i + 1}\t${s.filename ?? s.id}\t${ref}`;
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${projectTitle.replace(/[^\w.-]+/g, "_").slice(0, 40) || "gallery"}-proofing.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Button
      type="button"
      size="sm"
      className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
      disabled={!shots.length}
      onClick={exportList}
      title={
        shots.length
          ? "Download proofing list"
          : "No proofing yet"
      }
    >
      <Download className="mr-2 h-4 w-4" />
      Export proofing
    </Button>
  );
}
