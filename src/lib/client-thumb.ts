/**
 * Browser-side web thumbnail (canvas) for faster contact-sheet loads.
 * Best-effort — failures leave thumbnail_key null; full res still works.
 */

const MAX_EDGE = 960;
const JPEG_QUALITY = 0.82;

export async function makeClientThumbnail(
  file: File,
  maxEdge = MAX_EDGE
): Promise<Blob | null> {
  if (!file.type.startsWith("image/") && !/\.jpe?g$/i.test(file.name)) {
    return null;
  }
  // HEIC often fails in canvas — skip quietly
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  ) {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = bitmap;
      if (!width || !height) return null;

      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
      });
      return blob;
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

/** Object key sibling for a full-res storage path */
export function thumbnailObjectKey(storagePath: string) {
  const clean = storagePath.replace(/^\//, "");
  const slash = clean.lastIndexOf("/");
  if (slash < 0) return `thumbs/${clean}`;
  return `${clean.slice(0, slash)}/thumbs/${clean.slice(slash + 1)}`;
}
