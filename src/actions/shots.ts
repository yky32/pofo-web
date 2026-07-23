"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { contactSheet } from "@/lib/photos";
import type { Shot } from "@/types/database";

export type ShotActionState = {
  error?: string;
  success?: string;
};

export async function listProjectShots(projectId: string): Promise<Shot[]> {
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

  return (data ?? []) as Shot[];
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

export type SelectedShot = Shot & { selected_at: string };

/** Client favorites for photographer review. */
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

  const byId = new Map(shots.map((s) => [s.id as string, s as Shot]));
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

/** Register shots after browser upload to Supabase Storage. */
export async function registerUploadedShots(input: {
  projectId: string;
  files: {
    storagePath: string;
    previewUrl: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }[];
}): Promise<ShotActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }
  if (!input.files.length) return { error: "No files to register." };

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
        concept: "Exhibition",
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
    .eq("project_id", input.projectId);

  const baseOrder = count ?? 0;
  const rows = input.files.map((f, i) => ({
    project_id: input.projectId,
    container_id: container!.id,
    owner_id: user.id,
    kind: "jpeg" as const,
    storage_key: f.storagePath,
    preview_url: f.previewUrl,
    filename: f.filename,
    mime_type: f.mimeType,
    size_bytes: f.sizeBytes,
    sort_order: baseOrder + i,
  }));

  const { error } = await supabase.from("shots").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${input.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  return { success: `Uploaded ${rows.length} photo${rows.length === 1 ? "" : "s"}.` };
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
        concept: "Exhibition",
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

export async function markProjectFinal(
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

  const { error } = await supabase
    .from("projects")
    .update({ status: "final" })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard");
  return { success: "Project marked as final delivery." };
}
