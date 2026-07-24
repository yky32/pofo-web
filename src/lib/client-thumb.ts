/**
 * Browser-side web derivatives (canvas) for contact-sheet + lightbox.
 * Best-effort — failures leave keys null; full res still works for JPEG.
 */

const THUMB_EDGE = 720;
const PREVIEW_EDGE = 1800;
const JPEG_QUALITY_THUMB = 0.82;
const JPEG_QUALITY_PREVIEW = 0.85;

async function resizeToBlob(
  file: File,
  maxEdge: number,
  quality: number
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
  // Never try canvas on RAW
  if (
    /\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw)$/i.test(file.name)
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

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
      });
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

export async function makeClientThumbnail(
  file: File,
  maxEdge = THUMB_EDGE
): Promise<Blob | null> {
  return resizeToBlob(file, maxEdge, JPEG_QUALITY_THUMB);
}

/** Larger web preview for lightbox (~1600–1800px) */
export async function makeClientPreview(
  file: File,
  maxEdge = PREVIEW_EDGE
): Promise<Blob | null> {
  return resizeToBlob(file, maxEdge, JPEG_QUALITY_PREVIEW);
}

/** Object key sibling for a full-res storage path */
export function thumbnailObjectKey(storagePath: string) {
  const clean = storagePath.replace(/^\//, "");
  const slash = clean.lastIndexOf("/");
  if (slash < 0) return `thumbs/${clean}`;
  return `${clean.slice(0, slash)}/thumbs/${clean.slice(slash + 1)}`;
}

export function previewObjectKey(storagePath: string) {
  const clean = storagePath.replace(/^\//, "");
  const slash = clean.lastIndexOf("/");
  if (slash < 0) return `previews/${clean}.jpg`;
  return `${clean.slice(0, slash)}/previews/${clean.slice(slash + 1)}.jpg`;
}
