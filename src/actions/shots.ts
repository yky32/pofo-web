"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { contactSheet } from "@/lib/photos";
import { withDisplayUrls } from "@/lib/storage";
import type { Shot } from "@/types/database";

export type ShotActionState = {
  error?: string;
  success?: string;
};

export type ShotWithDisplay = Shot & {
  display_url: string | null;
  thumb_url?: string | null;
};

export async function listProjectShots(
  projectId: string
): Promise<ShotWithDisplay[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("shots")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listProjectShots", error.message);
    return [];
  }

  return withDisplayUrls(supabase, (data ?? []) as Shot[]);
}

export async function countProjectSelections(
  projectId: string
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("shot_selections")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) {
    console.error("countProjectSelections", error.message);
    return 0;
  }

  return count ?? 0;
}

export type SelectedShot = ShotWithDisplay & { selected_at: string };

/** Client proofing picks for photographer review. */
export async function listSelectedShots(
  projectId: string
): Promise<SelectedShot[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return [];

  const { data: sels, error } = await supabase
    .from("shot_selections")
    .select("shot_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !sels?.length) {
    if (error) console.error("listSelectedShots", error.message);
    return [];
  }

  const ids = sels.map((s) => s.shot_id as string);
  const { data: shots, error: sErr } = await supabase
    .from("shots")
    .select("*")
    .in("id", ids);

  if (sErr || !shots) {
    if (sErr) console.error("listSelectedShots shots", sErr.message);
    return [];
  }

  const withUrls = await withDisplayUrls(supabase, shots as Shot[]);
  const byId = new Map(withUrls.map((s) => [s.id, s]));
  const selectedAt = new Map(
    sels.map((s) => [s.shot_id as string, s.created_at as string])
  );

  return ids
    .map((id) => {
      const shot = byId.get(id);
      if (!shot) return null;
      return { ...shot, selected_at: selectedAt.get(id) ?? "" };
    })
    .filter((s): s is SelectedShot => Boolean(s));
}

const REGISTER_CHUNK = 50;

/** Register shots after browser upload (chunked inserts for large batches). */
export async function registerUploadedShots(input: {
  projectId: string;
  files: {
    storagePath: string;
    previewUrl: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    /** Optional web-friendly derivative object key */
    thumbnailKey?: string | null;
  }[];
  /** Continue sort_order from client when uploading multi-chunk batches */
  sortOrderStart?: number;
}): Promise<ShotActionState & { registered?: number; nextSortOrder?: number }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }
  if (!input.files.length) return { error: "No files to register." };
  // Guard single request size (client should chunk ~50–100)
  if (input.files.length > 150) {
    return { error: "Too many files in one request — send up to 150 at a time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  let { data: container } = await supabase
    .from("containers")
    .select("id")
    .eq("project_id", input.projectId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!container) {
    const { data: created, error: cErr } = await supabase
      .from("containers")
      .insert({
        project_id: input.projectId,
        name: "Main Gallery",
        sort_order: 0,
      })
      .select("id")
      .single();
    if (cErr || !created) {
      return { error: cErr?.message ?? "Could not create container." };
    }
    container = created;
  }

  let baseOrder = input.sortOrderStart;
  if (baseOrder == null) {
    const { count } = await supabase
      .from("shots")
      .select("id", { count: "exact", head: true })
      .eq("project_id", input.projectId);
    baseOrder = count ?? 0;
  }

  const rows = input.files.map((f, i) => {
    // Prefer storage_key only; never persist permanent public URLs for private buckets.
    // Empty/placeholder previewUrl → null (signed display_url at read time).
    const preview = f.previewUrl?.trim() || null;
    const thumb = f.thumbnailKey?.trim() || null;
    return {
      project_id: input.projectId,
      container_id: container!.id,
      owner_id: user.id,
      kind: "jpeg" as const,
      storage_key: f.storagePath,
      preview_url: preview,
      filename: f.filename,
      mime_type: f.mimeType,
      size_bytes: f.sizeBytes,
      sort_order: baseOrder! + i,
      ...(thumb ? { thumbnail_key: thumb } : {}),
    };
  });

  // Chunk inserts for safety even within one action call
  for (let i = 0; i < rows.length; i += REGISTER_CHUNK) {
    const slice = rows.slice(i, i + REGISTER_CHUNK);
    const { error } = await supabase.from("shots").insert(slice);
    if (error) return { error: error.message, registered: i };
  }

  revalidatePath(`/dashboard/galleries/${input.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  return {
    success: `Uploaded ${rows.length} photo${rows.length === 1 ? "" : "s"}.`,
    registered: rows.length,
    nextSortOrder: baseOrder! + rows.length,
  };
}

/** Seed Unsplash contact-sheet previews so share/proofing works without R2. */
export async function seedDemoShots(
  _prev: ShotActionState,
  formData: FormData
): Promise<ShotActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) return { error: "Missing project." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return { error: "Project not found." };

  let { data: container } = await supabase
    .from("containers")
    .select("id")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!container) {
    const { data: created, error: cErr } = await supabase
      .from("containers")
      .insert({
        project_id: projectId,
        name: "Main Gallery",
        sort_order: 0,
      })
      .select("id")
      .single();
    if (cErr || !created) {
      return { error: cErr?.message ?? "Could not create container." };
    }
    container = created;
  }

  const { count } = await supabase
    .from("shots")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const baseOrder = count ?? 0;
  const urls = contactSheet.slice(0, 16);
  const rows = urls.map((url, i) => ({
    project_id: projectId,
    container_id: container!.id,
    owner_id: user.id,
    kind: "preview" as const,
    preview_url: url,
    filename: `sample-${String(baseOrder + i + 1).padStart(3, "0")}.jpg`,
    mime_type: "image/jpeg",
    sort_order: baseOrder + i,
  }));

  const { error } = await supabase.from("shots").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  return { success: `Added ${rows.length} sample photos.` };
}

const PROJECT_STATUSES = [
  "draft",
  "shared",
  "proofing",
  "final",
  "archived",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

function isProjectStatus(v: string): v is ProjectStatusValue {
  return (PROJECT_STATUSES as readonly string[]).includes(v);
}

/**
 * Photographer can move a project to any status (draft ↔ shared ↔ proofing ↔ final ↔ archived).
 */
export async function updateProjectStatus(input: {
  projectId: string;
  status: string;
}): Promise<ShotActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const projectId = input.projectId?.trim();
  const status = input.status?.trim();
  if (!projectId) return { error: "Missing project." };
  if (!status || !isProjectStatus(status)) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  return { success: `Status set to ${status}.` };
}

/** @deprecated Prefer updateProjectStatus — kept for any old form posts */
export async function markProjectFinal(
  _prev: ShotActionState,
  formData: FormData
): Promise<ShotActionState> {
  const projectId = String(formData.get("project_id") ?? "").trim();
  return updateProjectStatus({ projectId, status: "final" });
}

const STUDIO_FLAGS = ["none", "print", "retouch", "hero", "reject"] as const;
export type StudioFlagValue = (typeof STUDIO_FLAGS)[number];

function isStudioFlag(v: string): v is StudioFlagValue {
  return (STUDIO_FLAGS as readonly string[]).includes(v);
}

/**
 * Photographer note + flag on a shot (studio-only; not shown to client).
 */
export async function updateShotStudioMeta(input: {
  projectId: string;
  shotId: string;
  studioNote?: string | null;
  studioFlag?: string | null;
}): Promise<ShotActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const projectId = input.projectId?.trim();
  const shotId = input.shotId?.trim();
  if (!projectId || !shotId) return { error: "Missing photo." };

  const patch: {
    studio_note?: string | null;
    studio_flag?: string | null;
  } = {};

  if (input.studioNote !== undefined) {
    const note = input.studioNote?.trim() || null;
    if (note && note.length > 2000) {
      return { error: "Note is too long (max 2000 characters)." };
    }
    patch.studio_note = note;
  }

  if (input.studioFlag !== undefined) {
    const flag = (input.studioFlag?.trim() || "none").toLowerCase();
    if (!isStudioFlag(flag)) return { error: "Invalid flag." };
    patch.studio_flag = flag === "none" ? null : flag;
  }

  if (!Object.keys(patch).length) return { error: "Nothing to update." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("shots")
    .update(patch)
    .eq("id", shotId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    if (error.message.includes("studio_note") || error.message.includes("studio_flag")) {
      return {
        error:
          "Database needs studio columns. Run supabase/features-p1-p2.sql in the SQL Editor.",
      };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/galleries/${projectId}`);
  return { success: "Saved." };
}

const DELETE_CHUNK = 100;

/**
 * Bulk-delete shots (DB rows + storage objects when keyed).
 * Owner-only; max 200 ids per request.
 */
export async function deleteProjectShots(input: {
  projectId: string;
  shotIds: string[];
}): Promise<ShotActionState & { deleted?: number }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const ids = [...new Set(input.shotIds.filter(Boolean))];
  if (!ids.length) return { error: "No photos selected." };
  if (ids.length > 200) {
    return { error: "Delete at most 200 photos at a time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const { data: rows, error: fetchErr } = await supabase
    .from("shots")
    .select("id, storage_key")
    .eq("project_id", input.projectId)
    .eq("owner_id", user.id)
    .in("id", ids);

  if (fetchErr) return { error: fetchErr.message };
  if (!rows?.length) return { error: "No matching photos." };

  // Best-effort storage cleanup (DB delete still proceeds if storage fails)
  const keys = rows
    .map((r) => r.storage_key as string | null)
    .filter((k): k is string => Boolean(k && !k.startsWith("http")));

  for (let i = 0; i < keys.length; i += DELETE_CHUNK) {
    const slice = keys.slice(i, i + DELETE_CHUNK);
    const { error: storErr } = await supabase.storage
      .from("shots")
      .remove(slice);
    if (storErr) {
      console.error("deleteProjectShots storage", storErr.message);
    }
  }

  const deleteIds = rows.map((r) => r.id as string);
  let deleted = 0;
  for (let i = 0; i < deleteIds.length; i += DELETE_CHUNK) {
    const slice = deleteIds.slice(i, i + DELETE_CHUNK);
    const { error, count } = await supabase
      .from("shots")
      .delete({ count: "exact" })
      .eq("project_id", input.projectId)
      .eq("owner_id", user.id)
      .in("id", slice);
    if (error) {
      return {
        error: error.message,
        deleted,
      };
    }
    deleted += count ?? slice.length;
  }

  revalidatePath(`/dashboard/galleries/${input.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  return {
    success: `Deleted ${deleted} photo${deleted === 1 ? "" : "s"}.`,
    deleted,
  };
}
