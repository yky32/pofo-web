"use server";

import { createClient } from "@/lib/supabase/server";
import { isR2Ready, createUploadUrl, photoStorageKey, r2PublicObjectUrl } from "@/lib/r2";
import { isSupabaseConfigured } from "@/lib/env";

const MAX_PREPARE = 150;
const MAX_BYTES = 30 * 1024 * 1024;

export type UploadBackend = "r2" | "supabase";

export type UploadSlot = {
  clientId: string;
  storagePath: string;
  /** Presigned PUT for R2; null when using Supabase client upload */
  uploadUrl: string | null;
  previewUrl: string;
  contentType: string;
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
 * Mint upload slots for a batch (R2 presign when configured, else Supabase paths).
 * Client uploads files directly — never through Next.js body.
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

  const useR2 = isR2Ready();
  const slots: UploadSlot[] = [];

  try {
    for (const f of input.files) {
      const contentType = f.contentType || "image/jpeg";
      const storagePath = photoStorageKey(
        user.id,
        input.projectId,
        f.filename
      );

      if (useR2) {
        const uploadUrl = await createUploadUrl(storagePath, contentType);
        slots.push({
          clientId: f.clientId,
          storagePath,
          uploadUrl,
          previewUrl: r2PublicObjectUrl(storagePath),
          contentType,
        });
      } else {
        // Supabase public URL shape (upload via client SDK)
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
        slots.push({
          clientId: f.clientId,
          storagePath,
          uploadUrl: null,
          previewUrl: `${base}/storage/v1/object/public/shots/${storagePath}`,
          contentType,
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
    backend: useR2 ? "r2" : "supabase",
    ownerId: user.id,
    slots,
  };
}

export async function getUploadBackend(): Promise<UploadBackend> {
  return isR2Ready() ? "r2" : "supabase";
}
