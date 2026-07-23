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

const MAX_PREPARE = 150;
const MAX_BYTES = 30 * 1024 * 1024;

export type UploadBackend = StorageBackend;

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
 */
export async function prepareBatchUpload(input: {
  projectId: string;
  files: {
    clientId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }[];
}): Promise<PrepareBatchResult> {
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
    if (f.sizeBytes > MAX_BYTES) {
      return {
        ok: false,
        error: `"${f.filename}" exceeds 30MB limit.`,
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

  const backend = getStorageBackend();
  const slots: UploadSlot[] = [];

  try {
    for (const f of input.files) {
      const contentType = f.contentType || "image/jpeg";
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
          // Prefer empty preview (signed GET at read time). Optional public base only if set.
          previewUrl: hasR2PublicBase() ? r2PublicObjectUrl(storagePath) : "",
          contentType,
          backend: "r2",
        });
      } else {
        // Supabase: upload with user JWT; store storage_key only (private bucket)
        slots.push({
          clientId: f.clientId,
          storagePath,
          uploadUrl: null,
          previewUrl: "",
          contentType,
          backend: "supabase",
        });
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to prepare uploads.",
    };
  }

  return {
    ok: true,
    backend,
    ownerId: user.id,
    slots,
  };
}

export async function getUploadBackend(): Promise<UploadBackend> {
  return getStorageBackend();
}
