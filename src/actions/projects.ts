"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Project } from "@/types/database";

export type ProjectActionState = {
  error?: string;
};

export async function listProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listProjects", error.message);
    return [];
  }

  const projects = (data ?? []) as Project[];
  if (projects.length === 0) return projects;

  // Attach photo / selection counts for dashboard cards
  const ids = projects.map((p) => p.id);
  const [{ data: shotRows }, { data: selRows }] = await Promise.all([
    supabase.from("shots").select("project_id").in("project_id", ids),
    supabase.from("shot_selections").select("project_id").in("project_id", ids),
  ]);

  const photoMap = new Map<string, number>();
  for (const row of shotRows ?? []) {
    const pid = (row as { project_id: string }).project_id;
    photoMap.set(pid, (photoMap.get(pid) ?? 0) + 1);
  }
  const selMap = new Map<string, number>();
  for (const row of selRows ?? []) {
    const pid = (row as { project_id: string }).project_id;
    selMap.set(pid, (selMap.get(pid) ?? 0) + 1);
  }

  return projects.map((p) => ({
    ...p,
    photo_count: photoMap.get(p.id) ?? 0,
    selection_count: selMap.get(p.id) ?? 0,
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getProject", error.message);
    return null;
  }

  return data as Project | null;
}

export async function createProject(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Supabase is not configured. See supabase/SETUP.md",
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  const selectionLimit = Number(formData.get("limit") ?? 40) || 40;

  if (!title) {
    return { error: "Title is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  // Ensure profile exists (e.g. if trigger missed)
  await supabase.from("profiles").upsert({
    id: user.id,
    display_name:
      user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? null,
    studio_name: user.user_metadata?.studio_name ?? null,
  });

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      client_name: clientName || null,
      selection_limit: Math.min(200, Math.max(1, selectionLimit)),
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !project) {
    return { error: error?.message ?? "Failed to create project." };
  }

  // Default container for future uploads
  await supabase.from("containers").insert({
    project_id: project.id,
    name: "Main Gallery",
    concept: "Exhibition",
    sort_order: 0,
    selection_limit: Math.min(200, Math.max(1, selectionLimit)),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  redirect(`/dashboard/galleries/${project.id}`);
}
