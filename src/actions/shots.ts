"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { contactSheet } from "@/lib/photos";
import { signReadUrls, withDisplayUrls } from "@/lib/storage";
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

export type PhotographerDownloadKind =
  | "preview"
  | "originals"
  | "raw"
  | "originals_and_raw";

/**
 * Mint short-lived download URLs for the photographer (owner).
 * - preview: web display (current ZIP behavior)
 * - originals: primary JPEG/storage_key (skips pure RAW keys when paired JPEG exists)
 * - raw: raw_key or storage_key when kind=raw
 * - originals_and_raw: both when present
 */
export async function getPhotographerDownloadFiles(input: {
  projectId: string;
  /** If empty/omitted → all project shots */
  shotIds?: string[];
  kind: PhotographerDownloadKind;
}): Promise<{ files: { filename: string; url: string }[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { files: [], error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { files: [], error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { files: [], error: "Project not found." };

  let q = supabase
    .from("shots")
    .select(
      "id, filename, storage_key, raw_key, preview_key, thumbnail_key, preview_url, mime_type, kind"
    )
    .eq("project_id", input.projectId)
    .eq("owner_id", user.id)
    .order("sort_order", { ascending: true });

  if (input.shotIds?.length) {
    q = q.in("id", input.shotIds);
  }

  const { data: rows, error } = await q;
  if (error) return { files: [], error: error.message };
  if (!rows?.length) return { files: [], error: "No photos to download." };

  type Row = {
    id: string;
    filename: string | null;
    storage_key: string | null;
    raw_key?: string | null;
    preview_key?: string | null;
    thumbnail_key?: string | null;
    preview_url?: string | null;
    mime_type?: string | null;
    kind?: string | null;
  };

  const shots = rows as Row[];
  const keys: string[] = [];

  function collectKeys(s: Row) {
    if (input.kind === "preview") {
      const k =
        s.preview_key?.trim() ||
        s.thumbnail_key?.trim() ||
        (s.kind !== "raw" ? s.storage_key?.trim() : null);
      if (k) keys.push(k);
      return;
    }
    if (input.kind === "originals" || input.kind === "originals_and_raw") {
      const sk = s.storage_key?.trim();
      if (sk && s.kind !== "raw") keys.push(sk);
      // raw-only shot: storage_key is the RAW — skip for "originals" (JPEG-only)
    }
    if (input.kind === "raw" || input.kind === "originals_and_raw") {
      const rk = s.raw_key?.trim();
      if (rk) keys.push(rk);
      else if (s.kind === "raw" && s.storage_key?.trim()) {
        keys.push(s.storage_key.trim());
      }
    }
  }

  for (const s of shots) collectKeys(s);

  // Also sign display fallbacks for preview mode via withDisplayUrls
  if (input.kind === "preview") {
    const withUrls = await withDisplayUrls(supabase, shots as Shot[]);
    const files = withUrls
      .map((s, i) => {
        const url = s.display_url || s.thumb_url;
        if (!url) return null;
        return {
          filename: s.filename ?? `photo-${i + 1}.jpg`,
          url,
        };
      })
      .filter((f): f is { filename: string; url: string } => Boolean(f));
    if (!files.length) {
      return { files: [], error: "No preview URLs available. Refresh and try again." };
    }
    return { files };
  }

  const signed = await signReadUrls(supabase, keys, 60 * 30); // 30 min for zip

  const files: { filename: string; url: string }[] = [];
  const used = new Set<string>();

  function pushFile(filename: string, url: string) {
    const name = filename || "file";
    let final = name;
    let n = 1;
    while (used.has(final.toLowerCase())) {
      const dot = name.lastIndexOf(".");
      final =
        dot > 0
          ? `${name.slice(0, dot)}_${n}${name.slice(dot)}`
          : `${name}_${n}`;
      n += 1;
    }
    used.add(final.toLowerCase());
    files.push({ filename: final, url });
  }

  for (const s of shots) {
    const base =
      (s.filename || "photo").replace(/\.[^.]+$/, "") || s.id.slice(0, 8);

    if (input.kind === "originals" || input.kind === "originals_and_raw") {
      const sk = s.storage_key?.trim();
      if (sk && s.kind !== "raw" && signed.has(sk)) {
        pushFile(s.filename || `${base}.jpg`, signed.get(sk)!);
      }
    }

    if (input.kind === "raw" || input.kind === "originals_and_raw") {
      const rk = s.raw_key?.trim();
      if (rk && signed.has(rk)) {
        const rawName =
          s.filename && /\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw)$/i.test(s.filename)
            ? s.filename
            : `${base}${extFromKey(rk)}`;
        pushFile(rawName, signed.get(rk)!);
      } else if (s.kind === "raw" && s.storage_key?.trim() && signed.has(s.storage_key.trim())) {
        pushFile(
          s.filename || `${base}${extFromKey(s.storage_key)}`,
          signed.get(s.storage_key.trim())!
        );
      }
    }
  }

  if (!files.length) {
    return {
      files: [],
      error:
        input.kind === "raw"
          ? "No RAW files in this set yet. Upload paired JPEG+RAW or RAW-only shots."
          : "No original files available to download.",
    };
  }

  return { files };
}

function extFromKey(key: string): string {
  const m = key.match(/(\.[a-z0-9]{2,5})$/i);
  return m?.[1] ?? ".raw";
}

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
    /** Companion RAW path when kind = paired */
    rawPath?: string | null;
    /** Client-made web preview path */
    previewPath?: string | null;
    kind?: "jpeg" | "raw" | "paired";
    processingStatus?: "ready" | "pending" | "failed";
  }[];
  /** Continue sort_order from client when uploading multi-chunk batches */
  sortOrderStart?: number;
}): Promise<ShotActionState & { registered?: number; nextSortOrder?: number }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase is not configured." };
    }
    if (!input.files.length) return { error: "No files to register." };
    if (input.files.length > 150) {
      return {
        error: "Too many files in one request — send up to 150 at a time.",
      };
    }

    const addBytes = input.files.reduce((s, f) => s + (f.sizeBytes || 0), 0);
    const { canUploadBytes } = await import("@/actions/billing");
    const storageGate = await canUploadBytes(addBytes);
    if (!storageGate.ok) {
      return {
        error:
          "STORAGE_LIMIT: Free storage is full. Upgrade to Solo for more space, or delete photos.",
      };
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
      const preview = f.previewUrl?.trim() || null;
      const thumb = f.thumbnailKey?.trim() || null;
      const rawPath = f.rawPath?.trim() || null;
      const previewPath = f.previewPath?.trim() || null;
      const kind = f.kind ?? (rawPath ? "paired" : "jpeg");
      const processingStatus =
        f.processingStatus ??
        (kind === "raw" && !previewPath && !thumb ? "pending" : "ready");

      return {
        project_id: input.projectId,
        container_id: container!.id,
        owner_id: user.id,
        kind,
        storage_key: f.storagePath,
        preview_url: preview,
        filename: f.filename,
        mime_type: f.mimeType,
        size_bytes: f.sizeBytes,
        sort_order: baseOrder! + i,
        ...(thumb ? { thumbnail_key: thumb } : {}),
        ...(rawPath ? { raw_key: rawPath } : {}),
        ...(previewPath ? { preview_key: previewPath } : {}),
        processing_status: processingStatus,
      };
    });

    for (let i = 0; i < rows.length; i += REGISTER_CHUNK) {
      const slice = rows.slice(i, i + REGISTER_CHUNK);
      let { error } = await supabase.from("shots").insert(slice);
      if (
        error &&
        (error.message.includes("raw_key") ||
          error.message.includes("preview_key") ||
          error.message.includes("processing_status") ||
          error.message.includes("paired") ||
          error.code === "42703" ||
          error.code === "23514")
      ) {
        const legacy = slice.map((r) => ({
          project_id: r.project_id,
          container_id: r.container_id,
          owner_id: r.owner_id,
          kind: r.kind === "paired" || r.kind === "raw" ? "jpeg" : r.kind,
          storage_key: r.storage_key,
          preview_url: r.preview_url,
          filename: r.filename,
          mime_type: r.mime_type,
          size_bytes: r.size_bytes,
          sort_order: r.sort_order,
          ...("thumbnail_key" in r && r.thumbnail_key
            ? { thumbnail_key: r.thumbnail_key }
            : {}),
        }));
        const retry = await supabase.from("shots").insert(legacy);
        error = retry.error;
        if (error) {
          return {
            error:
              "Upload columns missing or outdated. Run supabase/features-raw-pipeline.sql in the SQL Editor, then retry.",
            registered: i,
          };
        }
      } else if (error) {
        return { error: error.message, registered: i };
      }
    }

    revalidatePath(`/dashboard/galleries/${input.projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/galleries");
    return {
      success: `Uploaded ${rows.length} photo${rows.length === 1 ? "" : "s"}.`,
      registered: rows.length,
      nextSortOrder: baseOrder! + rows.length,
    };
  } catch (e) {
    console.error("registerUploadedShots", e);
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not save photos. Sign in again and retry.",
    };
  }
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
 * Bulk-delete shots (DB rows + all storage keys when present).
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
    .select("id, storage_key, raw_key, preview_key, thumbnail_key")
    .eq("project_id", input.projectId)
    .eq("owner_id", user.id)
    .in("id", ids);

  if (fetchErr) return { error: fetchErr.message };
  if (!rows?.length) return { error: "No matching photos." };

  // Best-effort storage cleanup for every object key on the shot
  const keySet = new Set<string>();
  for (const r of rows) {
    for (const k of [
      r.storage_key,
      (r as { raw_key?: string | null }).raw_key,
      (r as { preview_key?: string | null }).preview_key,
      (r as { thumbnail_key?: string | null }).thumbnail_key,
    ]) {
      const key = typeof k === "string" ? k.trim() : "";
      if (key && !key.startsWith("http")) keySet.add(key);
    }
  }
  const keys = [...keySet];

  for (let i = 0; i < keys.length; i += DELETE_CHUNK) {
    const slice = keys.slice(i, i + DELETE_CHUNK);
    const { error: storErr } = await supabase.storage
      .from("shots")
      .remove(slice);
    if (storErr) {
      console.error("deleteProjectShots storage", storErr.message);
    }
  }

  // DB rows first-class: must actually remove or we report failure
  const deleteIds = rows.map((r) => r.id as string);
  let deleted = 0;
  for (let i = 0; i < deleteIds.length; i += DELETE_CHUNK) {
    const slice = deleteIds.slice(i, i + DELETE_CHUNK);
    const { data: removed, error } = await supabase
      .from("shots")
      .delete()
      .eq("project_id", input.projectId)
      .eq("owner_id", user.id)
      .in("id", slice)
      .select("id");
    if (error) {
      return {
        error: error.message,
        deleted,
      };
    }
    deleted += removed?.length ?? 0;
  }

  if (deleted === 0) {
    return {
      error:
        "Could not delete photos (permission or already gone). Refresh and try again.",
      deleted: 0,
    };
  }

  // Confirm gone (catches RLS no-op / soft failures)
  const { count: stillThere } = await supabase
    .from("shots")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.projectId)
    .in("id", deleteIds);

  if ((stillThere ?? 0) > 0) {
    return {
      error: `Only partially deleted — ${stillThere} still in database. Check RLS / owner on those rows.`,
      deleted,
    };
  }

  revalidatePath(`/dashboard/galleries/${input.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  return {
    success: `Deleted ${deleted} photo${deleted === 1 ? "" : "s"}.`,
    deleted,
  };
}
