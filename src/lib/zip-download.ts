/**
 * Client-side ZIP of proofing photos (browser fetch of signed/display URLs).
 */

import JSZip from "jszip";

export type ZipFileItem = {
  filename: string;
  url: string;
};

function safeName(name: string, fallback: string) {
  const base = (name || fallback).replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80);
  return base || fallback;
}

export async function downloadProofingZip(
  projectTitle: string,
  files: ZipFileItem[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (!files.length) throw new Error("No photos to download.");

  const zip = new JSZip();
  const folder = zip.folder(
    safeName(projectTitle, "proofing").replace(/\s+/g, "_") || "proofing"
  );
  if (!folder) throw new Error("Could not create zip folder.");

  const used = new Set<string>();
  let done = 0;
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let name = safeName(f.filename, `photo-${i + 1}.jpg`);
    if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(name)) {
      name = `${name}.jpg`;
    }
    // Dedupe names
    let final = name;
    let n = 1;
    while (used.has(final.toLowerCase())) {
      const dot = name.lastIndexOf(".");
      final =
        dot > 0
          ? `${name.slice(0, dot)}_${n}${name.slice(dot)}`
          : `${name}_${n}`;
      n += 1;
    }
    used.add(final.toLowerCase());

    const res = await fetch(f.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${final} (${res.status})`);
    }
    const blob = await res.blob();
    folder.file(final, blob);
    done += 1;
    onProgress?.(done, total);
  }

  const out = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(out);
  a.download = `${safeName(projectTitle, "gallery")}-proofing.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}
