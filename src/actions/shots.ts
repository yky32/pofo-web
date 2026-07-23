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

  if ((count ?? 0) > 0) {
    return { error: "This project already has photos." };
  }

  const urls = contactSheet.slice(0, 16);
  const rows = urls.map((url, i) => ({
    project_id: projectId,
    container_id: container!.id,
    owner_id: user.id,
    kind: "preview" as const,
    preview_url: url,
    filename: `frame-${String(i + 1).padStart(3, "0")}.jpg`,
    mime_type: "image/jpeg",
    sort_order: i,
  }));

  const { error } = await supabase.from("shots").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  return { success: `Added ${rows.length} preview photos.` };
}
