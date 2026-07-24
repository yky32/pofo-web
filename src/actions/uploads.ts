"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createUploadUrl,
  photoStorageKey,
  r2PublicObjectUrl,
  isR2Ready,
  hasR2PublicBase,
} from "@/lib/r2";
import { getStorageBackend, type StorageBackend } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/env";
import { maxBytesForFile, isRawFile } from "@/lib/media";

const MAX_PREPARE = 150;

export type UploadBackend = StorageBackend;

export type AssetRole = "original" | "raw" | "preview" | "thumb";

export type UploadSlot = {
  clientId: string;
  storagePath: string;
  /** Presigned PUT for R2; null when using Supabase session upload */
  uploadUrl: string | null;
  /**
   * Optional hint URL — for R2 may be public base path;
   * for Supabase private, leave empty (client registers storage_key only).
   */
  previewUrl: string;
  contentType: string;
  backend: UploadBackend;
  assetRole?: AssetRole;
};

export type PrepareBatchResult =
  | {
      ok: true;
      backend: UploadBackend;
      ownerId: string;
      slots: UploadSlot[];
    }
  | { ok: false; error: string };

/**
 * Mint upload slots. Files go browser → storage (never through Next body).
 * Backend switches automatically: R2 when env ready, else Supabase Storage.
 * JPEG ≤ 30MB · RAW ≤ 100MB.
 */
export async function prepareBatchUpload(input: {
  projectId: string;
  files: {
    clientId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    assetRole?: AssetRole;
  }[];
}): Promise<PrepareBatchResult> {
  try {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: "Supabase is not configured." };
    }
    if (!input.files.length) {
      return { ok: false, error: "No files." };
    }
    if (input.files.length > MAX_PREPARE) {
      return {
        ok: false,
        error: `Prepare at most ${MAX_PREPARE} files per request.`,
      };
    }

    for (const f of input.files) {
      const max = maxBytesForFile(f.filename, f.contentType);
      if (f.sizeBytes > max) {
        const label = isRawFile(f.filename, f.contentType) ? "100MB" : "30MB";
        return {
          ok: false,
          error: `"${f.filename}" exceeds ${label} limit.`,
        };
      }
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be logged in." };

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", input.projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!project) return { ok: false, error: "Project not found." };

    // Default Supabase; R2 only if STORAGE_BACKEND=r2 and configured
    const backend = getStorageBackend();
    const slots: UploadSlot[] = [];

    for (const f of input.files) {
      const contentType =
        f.contentType ||
        (isRawFile(f.filename, f.contentType)
          ? "application/octet-stream"
          : "image/jpeg");
      const storagePath = photoStorageKey(
        user.id,
        input.projectId,
        f.filename
      );

      if (backend === "r2" && isR2Ready()) {
        const uploadUrl = await createUploadUrl(storagePath, contentType);
        slots.push({
          clientId: f.clientId,
          storagePath,
          uploadUrl,
          previewUrl: hasR2PublicBase() ? r2PublicObjectUrl(storagePath) : "",
          contentType,
          backend: "r2",
          assetRole: f.assetRole ?? "original",
        });
      } else {
        slots.push({
          clientId: f.clientId,
          storagePath,
          uploadUrl: null,
          previewUrl: "",
          contentType,
          backend: "supabase",
          assetRole: f.assetRole ?? "original",
        });
      }
    }

    return {
      ok: true,
      backend: backend === "r2" && isR2Ready() ? "r2" : "supabase",
      ownerId: user.id,
      slots,
    };
  } catch (e) {
    console.error("prepareBatchUpload", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Failed to prepare uploads. Sign in again and retry.",
    };
  }
}

export async function getUploadBackend(): Promise<UploadBackend> {
  return getStorageBackend();
}
