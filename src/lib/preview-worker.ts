/**
 * Server-side web derivatives via Sharp (JPEG sources only).
 * Pure RAW without a JPEG original stays pending — no libraw.
 */

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  previewObjectKey,
  thumbnailObjectKey,
} from "@/lib/client-thumb";
import { SHOTS_BUCKET } from "@/lib/storage";

const THUMB_EDGE = 720;
const PREVIEW_EDGE = 1800;

function isJpegish(key: string, mime?: string | null) {
  if (mime && /^image\/(jpeg|jpg|png|webp)$/i.test(mime)) return true;
  return /\.(jpe?g|png|webp)$/i.test(key);
}

function isRawish(key: string, mime?: string | null) {
  if (mime && /raw|x-canon|x-nikon|x-sony|x-adobe-dng/i.test(mime)) return true;
  return /\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw)(\?|$)/i.test(key);
}

export type PreviewWorkerResult = {
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
};

/**
 * Process pending / missing-preview shots for a project (or all owner projects).
 * Non-blocking for upload path — call from cron/API or photographer action.
 */
export async function processPendingPreviews(
  supabase: SupabaseClient,
  opts: {
    projectId?: string;
    ownerId?: string;
    limit?: number;
  } = {}
): Promise<PreviewWorkerResult> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  // Prefer pending; also catch ready rows missing web derivatives
  let q = supabase
    .from("shots")
    .select(
      "id, project_id, storage_key, preview_key, thumbnail_key, mime_type, kind, processing_status"
    )
    .eq("processing_status", "pending")
    .limit(limit);

  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.ownerId) q = q.eq("owner_id", opts.ownerId);

  const first = await q;
  if (first.error) {
    return {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [first.error.message],
    };
  }

  let rows = first.data ?? [];

  // Second pass: missing preview_key on JPEG/paired (optional backfill)
  if (rows.length < limit && opts.projectId) {
    const need = limit - rows.length;
    let q2 = supabase
      .from("shots")
      .select(
        "id, project_id, storage_key, preview_key, thumbnail_key, mime_type, kind, processing_status"
      )
      .eq("project_id", opts.projectId)
      .is("preview_key", null)
      .in("kind", ["jpeg", "paired", "preview", "final"])
      .limit(need);
    if (opts.ownerId) q2 = q2.eq("owner_id", opts.ownerId);
    const second = await q2;
    if (!second.error && second.data?.length) {
      const seen = new Set(rows.map((r) => r.id as string));
      rows = [
        ...rows,
        ...second.data.filter((r) => !seen.has(r.id as string)),
      ];
    }
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    const s = row as {
      id: string;
      storage_key: string | null;
      preview_key?: string | null;
      thumbnail_key?: string | null;
      mime_type?: string | null;
      kind?: string | null;
    };

    const key = s.storage_key?.trim();
    if (!key) {
      skipped += 1;
      continue;
    }

    // Only generate from JPEG-like primary; pure RAW stays pending
    if (s.kind === "raw" || isRawish(key, s.mime_type)) {
      if (!isJpegish(key, s.mime_type)) {
        skipped += 1;
        continue;
      }
    }
    if (!isJpegish(key, s.mime_type) && s.kind !== "jpeg" && s.kind !== "paired" && s.kind !== "preview" && s.kind !== "final") {
      skipped += 1;
      continue;
    }
    // Skip if already has both derivatives and not forced pending with keys
    if (s.preview_key?.trim() && s.thumbnail_key?.trim()) {
      await supabase
        .from("shots")
        .update({
          processing_status: "ready",
          processing_error: null,
        })
        .eq("id", s.id);
      processed += 1;
      continue;
    }

    try {
      const { data: blob, error: dlErr } = await supabase.storage
        .from(SHOTS_BUCKET)
        .download(key);
      if (dlErr || !blob) {
        throw new Error(dlErr?.message ?? "download failed");
      }
      const buf = Buffer.from(await blob.arrayBuffer());

      const thumbKey = s.thumbnail_key?.trim() || thumbnailObjectKey(key);
      const prevKey = s.preview_key?.trim() || previewObjectKey(key);

      const [thumbBuf, prevBuf] = await Promise.all([
        sharp(buf)
          .rotate()
          .resize(THUMB_EDGE, THUMB_EDGE, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer(),
        sharp(buf)
          .rotate()
          .resize(PREVIEW_EDGE, PREVIEW_EDGE, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer(),
      ]);

      const upThumb = await supabase.storage
        .from(SHOTS_BUCKET)
        .upload(thumbKey, thumbBuf, {
          contentType: "image/jpeg",
          upsert: true,
          cacheControl: "31536000",
        });
      if (upThumb.error) throw new Error(upThumb.error.message);

      const upPrev = await supabase.storage
        .from(SHOTS_BUCKET)
        .upload(prevKey, prevBuf, {
          contentType: "image/jpeg",
          upsert: true,
          cacheControl: "31536000",
        });
      if (upPrev.error) throw new Error(upPrev.error.message);

      const { error: upErr } = await supabase
        .from("shots")
        .update({
          thumbnail_key: thumbKey,
          preview_key: prevKey,
          processing_status: "ready",
          processing_error: null,
        })
        .eq("id", s.id);
      if (upErr) throw new Error(upErr.message);
      processed += 1;
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : "preview failed";
      errors.push(`${s.id}: ${msg}`);
      await supabase
        .from("shots")
        .update({
          processing_status: "failed",
          processing_error: msg.slice(0, 500),
        })
        .eq("id", s.id);
    }
  }

  return { processed, failed, skipped, errors: errors.slice(0, 10) };
}
