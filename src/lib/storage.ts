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

export function getStorageBackend(): StorageBackend {
  return isR2Ready() ? "r2" : "supabase";
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

/**
 * Attach `display_url` for UI: external samples unchanged, storage keys signed.
 * When `thumbnail_key` is present, `thumb_url` is also signed for grid previews.
 */
export async function withDisplayUrls<
  T extends {
    storage_key?: string | null;
    preview_url?: string | null;
    thumbnail_key?: string | null;
  },
>(
  supabase: SupabaseClient,
  shots: T[],
  expiresIn = READ_URL_TTL_SEC
): Promise<(T & { display_url: string | null; thumb_url?: string | null })[]> {
  const keys: string[] = [];
  for (const s of shots) {
    const ext = externalDisplayUrl(s);
    if (!ext) {
      const key = resolveObjectKey(s);
      if (key) keys.push(key);
    }
    const thumb = s.thumbnail_key?.trim();
    if (thumb && !isExternalHttpUrl(thumb)) keys.push(thumb);
  }

  const signed = await signReadUrls(supabase, keys, expiresIn);

  return shots.map((s) => {
    let display_url: string | null = null;
    const ext = externalDisplayUrl(s);
    if (ext) {
      display_url = ext;
    } else {
      const key = resolveObjectKey(s);
      if (key && signed.has(key)) {
        display_url = signed.get(key)!;
      } else if (s.preview_url && isExternalHttpUrl(s.preview_url)) {
        display_url = s.preview_url;
      }
    }

    const thumbKey = s.thumbnail_key?.trim();
    const thumb_url =
      thumbKey && !isExternalHttpUrl(thumbKey) && signed.has(thumbKey)
        ? signed.get(thumbKey)!
        : null;

    return { ...s, display_url, thumb_url };
  });
}
