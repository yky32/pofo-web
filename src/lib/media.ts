/**
 * Media type helpers for JPEG vs RAW upload / display (Phase A).
 */

export const JPEG_MAX_BYTES = 30 * 1024 * 1024;
export const RAW_MAX_BYTES = 100 * 1024 * 1024;

export const RAW_EXT_RE =
  /\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw|3fr|fff|iiq)$/i;
export const JPEG_EXT_RE = /\.(jpe?g|png|webp)$/i;
export const HEIC_EXT_RE = /\.(heic|heif)$/i;

export type MediaKind = "jpeg" | "raw" | "heic" | "unknown";

export function basenameKey(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").toLowerCase().trim();
}

export function detectMediaKind(
  filename: string,
  mimeType?: string | null
): MediaKind {
  const name = filename || "";
  const mime = (mimeType || "").toLowerCase();
  if (RAW_EXT_RE.test(name) || mime.includes("raw") || mime.includes("x-canon") || mime.includes("x-nikon") || mime.includes("x-sony")) {
    return "raw";
  }
  if (HEIC_EXT_RE.test(name) || mime === "image/heic" || mime === "image/heif") {
    return "heic";
  }
  if (
    JPEG_EXT_RE.test(name) ||
    mime.startsWith("image/jpeg") ||
    mime.startsWith("image/png") ||
    mime.startsWith("image/webp") ||
    mime.startsWith("image/")
  ) {
    return "jpeg";
  }
  if (RAW_EXT_RE.test(name)) return "raw";
  return "unknown";
}

export function isRawFile(filename: string, mimeType?: string | null): boolean {
  return detectMediaKind(filename, mimeType) === "raw";
}

export function isBrowserDecodableImage(
  filename: string,
  mimeType?: string | null
): boolean {
  const kind = detectMediaKind(filename, mimeType);
  return kind === "jpeg"; // HEIC often fails canvas; treat as needs-preview
}

export function maxBytesForFile(
  filename: string,
  mimeType?: string | null
): number {
  return isRawFile(filename, mimeType) ? RAW_MAX_BYTES : JPEG_MAX_BYTES;
}

export function isDisplayableMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return (
    m.startsWith("image/jpeg") ||
    m.startsWith("image/png") ||
    m.startsWith("image/webp") ||
    m.startsWith("image/gif")
  );
}

/** Group files by basename for JPEG+RAW pairing */
export function groupFilesByBasename<T extends { name: string; type?: string }>(
  files: T[]
): { key: string; jpeg?: T; raw?: T; others: T[] }[] {
  const map = new Map<string, { jpeg?: T; raw?: T; others: T[] }>();
  for (const f of files) {
    const key = basenameKey(f.name);
    let g = map.get(key);
    if (!g) {
      g = { others: [] };
      map.set(key, g);
    }
    const kind = detectMediaKind(f.name, f.type);
    if (kind === "raw" && !g.raw) g.raw = f;
    else if ((kind === "jpeg" || kind === "heic") && !g.jpeg) g.jpeg = f;
    else g.others.push(f);
  }
  return [...map.entries()].map(([key, g]) => ({ key, ...g }));
}
