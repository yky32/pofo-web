/**
 * Client-side ZIP of gallery photos (browser fetch of signed/display URLs).
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

export async function downloadPhotosZip(
  projectTitle: string,
  files: ZipFileItem[],
  options?: {
    /** Folder + zip name suffix, e.g. "full" or "proofing" or "raw" */
    kind?: string;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<void> {
  if (!files.length) throw new Error("No photos to download.");

  const kind = options?.kind ?? "proofing";
  const onProgress = options?.onProgress;
  const label = kind.replace(/[^\w.-]+/g, "-") || "download";

  const zip = new JSZip();
  const folder = zip.folder(
    `${safeName(projectTitle, "gallery").replace(/\s+/g, "_") || "gallery"}-${label}`
  );
  if (!folder) throw new Error("Could not create zip folder.");

  const used = new Set<string>();
  let done = 0;
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    // Keep original extension for RAW (cr2/nef/arw/…); default .jpg only if none
    let name = safeName(f.filename, `photo-${i + 1}`);
    if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
      name = `${name}.jpg`;
    }
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
  a.download = `${safeName(projectTitle, "gallery")}-${label}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** @deprecated use downloadPhotosZip */
export const downloadProofingZip = (
  projectTitle: string,
  files: ZipFileItem[],
  onProgress?: (done: number, total: number) => void
) =>
  downloadPhotosZip(projectTitle, files, {
    kind: "proofing",
    onProgress,
  });
