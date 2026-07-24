/**
 * Switchable object storage: Supabase Storage (default) or Cloudflare R2.
 * App code should only use this module + actions/uploads — not raw URLs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isR2Configured } from "@/lib/env";
import {
  createDownloadUrl as r2SignedGet,
  isR2Ready,
  r2PublicObjectUrl,
} from "@/lib/r2";

export type StorageBackend = "supabase" | "r2";

export const SHOTS_BUCKET = "shots";

/** Default signed URL lifetime for gallery views */
export const READ_URL_TTL_SEC = 60 * 60; // 1 hour

/**
 * Default: Supabase private `shots` bucket.
 * R2 only when explicitly enabled (STORAGE_BACKEND=r2 or FORCE_R2=1) and configured.
 */
export function getStorageBackend(): StorageBackend {
  const forced = (process.env.STORAGE_BACKEND || "").toLowerCase();
  if (forced === "supabase" || forced === "supabase_storage") {
    return "supabase";
  }
  if (
    (forced === "r2" || process.env.FORCE_R2 === "1") &&
    isR2Ready()
  ) {
    return "r2";
  }
  // Prefer Supabase for professional-ready path unless R2 is forced
  if (isR2Ready() && forced === "auto") {
    return "r2";
  }
  return "supabase";
}

export function isExternalHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

/** True if URL is (or was) a public Supabase object URL we should re-sign. */
export function isSupabasePublicObjectUrl(url: string): boolean {
  return (
    url.includes("/storage/v1/object/public/shots/") ||
    url.includes("/storage/v1/object/sign/shots/")
  );
}

/**
 * Resolve storage object key from a shot row (handles legacy public URLs).
 */
export function resolveObjectKey(shot: {
  storage_key?: string | null;
  preview_url?: string | null;
}): string | null {
  const key = shot.storage_key?.trim();
  if (key && !isExternalHttpUrl(key)) return key.replace(/^\//, "");

  const preview = shot.preview_url?.trim();
  if (!preview) return null;

  if (isSupabasePublicObjectUrl(preview)) {
    const marker = "/object/public/shots/";
    const i = preview.indexOf(marker);
    if (i >= 0) return decodeURIComponent(preview.slice(i + marker.length));
    const signMarker = "/object/sign/shots/";
    const j = preview.indexOf(signMarker);
    if (j >= 0) {
      const rest = preview.slice(j + signMarker.length);
      return decodeURIComponent(rest.split("?")[0] ?? rest);
    }
  }

  // External CDN / Unsplash sample — not our object key
  if (isExternalHttpUrl(preview) && !isSupabasePublicObjectUrl(preview)) {
    return null;
  }

  return key ?? null;
}

/** Prefer permanent external sample URLs; else need signing. */
export function externalDisplayUrl(shot: {
  storage_key?: string | null;
  preview_url?: string | null;
}): string | null {
  const preview = shot.preview_url?.trim();
  if (
    preview &&
    isExternalHttpUrl(preview) &&
    !isSupabasePublicObjectUrl(preview) &&
    !preview.includes(".r2.dev/") &&
    !preview.includes("r2.cloudflarestorage.com")
  ) {
    return preview;
  }
  // R2 public URL can be used if bucket is public; still fine as display
  if (preview && isExternalHttpUrl(preview) && getStorageBackend() === "r2") {
    return preview;
  }
  return null;
}

/**
 * Create short-lived read URLs for object keys.
 * - Supabase: createSignedUrls (private bucket)
 * - R2: presigned GET (or public URL if configured)
 */
export async function signReadUrls(
  supabase: SupabaseClient,
  keys: string[],
  expiresIn = READ_URL_TTL_SEC
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return map;

  const backend = getStorageBackend();

  if (backend === "r2" && isR2Configured()) {
    await Promise.all(
      unique.map(async (key) => {
        try {
          // Prefer short-lived GET for private-style access; fall back to public base
          const signed = await r2SignedGet(key, expiresIn);
          map.set(key, signed);
        } catch {
          try {
            map.set(key, r2PublicObjectUrl(key));
          } catch {
            /* skip */
          }
        }
      })
    );
    return map;
  }

  // Supabase signed URLs (works with private bucket if client can sign)
  const { data, error } = await supabase.storage
    .from(SHOTS_BUCKET)
    .createSignedUrls(unique, expiresIn);

  if (error) {
    console.error("signReadUrls", error.message);
    return map;
  }

  for (const row of data ?? []) {
    if (row.path && row.signedUrl && !row.error) {
      map.set(row.path, row.signedUrl);
    }
  }

  return map;
}

function isLikelyRawKey(key: string, mime?: string | null): boolean {
  if (mime && /raw|x-canon|x-nikon|x-sony|x-adobe-dng/i.test(mime)) return true;
  return /\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw|3fr|fff|iiq)(\?|$)/i.test(
    key
  );
}

/**
 * Attach `display_url` for UI.
 * Priority: external sample → preview_key → jpeg storage_key → never RAW.
 * When `thumbnail_key` is present, `thumb_url` is signed for grid previews.
 */
export async function withDisplayUrls<
  T extends {
    storage_key?: string | null;
    preview_url?: string | null;
    preview_key?: string | null;
    thumbnail_key?: string | null;
    mime_type?: string | null;
    kind?: string | null;
    processing_status?: string | null;
  },
>(
  supabase: SupabaseClient,
  shots: T[],
  expiresIn = READ_URL_TTL_SEC
): Promise<(T & { display_url: string | null; thumb_url?: string | null })[]> {
  const keys: string[] = [];

  for (const s of shots) {
    const thumb = s.thumbnail_key?.trim();
    if (thumb && !isExternalHttpUrl(thumb)) keys.push(thumb);

    const previewKey = s.preview_key?.trim();
    if (previewKey && !isExternalHttpUrl(previewKey)) keys.push(previewKey);

    const ext = externalDisplayUrl(s);
    if (!ext) {
      const key = resolveObjectKey(s);
      // Never sign RAW for display
      if (
        key &&
        s.kind !== "raw" &&
        !isLikelyRawKey(key, s.mime_type)
      ) {
        keys.push(key);
      }
    }
  }

  const signed = await signReadUrls(supabase, keys, expiresIn);

  return shots.map((s) => {
    let display_url: string | null = null;
    const ext = externalDisplayUrl(s);
    if (ext) {
      display_url = ext;
    } else {
      const previewKey = s.preview_key?.trim();
      if (previewKey && signed.has(previewKey)) {
        display_url = signed.get(previewKey)!;
      } else {
        const key = resolveObjectKey(s);
        if (
          key &&
          s.kind !== "raw" &&
          !isLikelyRawKey(key, s.mime_type) &&
          signed.has(key)
        ) {
          display_url = signed.get(key)!;
        } else if (s.preview_url && isExternalHttpUrl(s.preview_url)) {
          display_url = s.preview_url;
        }
        // raw-only / pending → display_url stays null (placeholder UI)
      }
    }

    const thumbKey = s.thumbnail_key?.trim();
    let thumb_url: string | null =
      thumbKey && !isExternalHttpUrl(thumbKey) && signed.has(thumbKey)
        ? signed.get(thumbKey)!
        : null;
    // Fall back grid to display when no thumb
    if (!thumb_url && display_url) thumb_url = display_url;

    return { ...s, display_url, thumb_url };
  });
}
