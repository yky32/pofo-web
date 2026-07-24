"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { withDisplayUrls } from "@/lib/storage";
import { getCurrentWorkspace } from "@/actions/teams";
import { parseProjectTags } from "@/lib/project-tags";
import type { Project } from "@/types/database";

export type ProjectActionState = {
  error?: string;
  success?: string;
};

export async function listProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspace = await getCurrentWorkspace();

  let query = supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (workspace.kind === "team") {
    query = query
      .eq("owner_type", "team")
      .eq("owner_id", workspace.teamId);
  } else {
    // Personal: only user-owned projects (never team projects)
    query = query.eq("owner_id", user.id).eq("owner_type", "user");
  }

  const { data, error } = await query;

  if (error) {
    // owner_type column missing — fall back to personal-only list
    if (
      error.message.includes("owner_type") ||
      error.code === "42703"
    ) {
      const { data: legacy } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });
      return attachProjectMeta(supabase, (legacy ?? []) as Project[]);
    }
    console.error("listProjects", error.message);
    return [];
  }

  let projects = (data ?? []) as Project[];

  // Extra safety: in personal workspace ignore team rows if owner_type missing on filter
  if (workspace.kind === "personal") {
    projects = projects.filter(
      (p) => !p.owner_type || p.owner_type === "user"
    );
  }

  if (projects.length === 0) return projects;

  // Attach photo / selection counts + cover for dashboard cards
  const ids = projects.map((p) => p.id);
  const [{ data: shotRows }, { data: selRows }] = await Promise.all([
    supabase
      .from("shots")
      .select("id, project_id, storage_key, preview_url, sort_order, created_at")
      .in("project_id", ids)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("shot_selections").select("project_id").in("project_id", ids),
  ]);

  const photoMap = new Map<string, number>();
  const coverShotByProject = new Map<
    string,
    {
      id: string;
      storage_key: string | null;
      preview_url: string | null;
    }
  >();

  for (const row of shotRows ?? []) {
    const r = row as {
      id: string;
      project_id: string;
      storage_key: string | null;
      preview_url: string | null;
    };
    photoMap.set(r.project_id, (photoMap.get(r.project_id) ?? 0) + 1);
    if (!coverShotByProject.has(r.project_id)) {
      coverShotByProject.set(r.project_id, {
        id: r.id,
        storage_key: r.storage_key,
        preview_url: r.preview_url,
      });
    }
  }

  const selMap = new Map<string, number>();
  for (const row of selRows ?? []) {
    const pid = (row as { project_id: string }).project_id;
    selMap.set(pid, (selMap.get(pid) ?? 0) + 1);
  }

  return finalizeProjectList(
    supabase,
    projects,
    photoMap,
    selMap,
    coverShotByProject
  );
}

async function attachProjectMeta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projects: Project[]
): Promise<Project[]> {
  if (!projects.length) return projects;
  const ids = projects.map((p) => p.id);
  const [{ data: shotRows }, { data: selRows }] = await Promise.all([
    supabase
      .from("shots")
      .select("id, project_id, storage_key, preview_url, sort_order, created_at")
      .in("project_id", ids)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("shot_selections").select("project_id").in("project_id", ids),
  ]);

  const photoMap = new Map<string, number>();
  const coverShotByProject = new Map<
    string,
    { id: string; storage_key: string | null; preview_url: string | null }
  >();
  for (const row of shotRows ?? []) {
    const r = row as {
      id: string;
      project_id: string;
      storage_key: string | null;
      preview_url: string | null;
    };
    photoMap.set(r.project_id, (photoMap.get(r.project_id) ?? 0) + 1);
    if (!coverShotByProject.has(r.project_id)) {
      coverShotByProject.set(r.project_id, {
        id: r.id,
        storage_key: r.storage_key,
        preview_url: r.preview_url,
      });
    }
  }
  const selMap = new Map<string, number>();
  for (const row of selRows ?? []) {
    const pid = (row as { project_id: string }).project_id;
    selMap.set(pid, (selMap.get(pid) ?? 0) + 1);
  }
  return finalizeProjectList(
    supabase,
    projects,
    photoMap,
    selMap,
    coverShotByProject
  );
}

async function finalizeProjectList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projects: Project[],
  photoMap: Map<string, number>,
  selMap: Map<string, number>,
  coverShotByProject: Map<
    string,
    { id: string; storage_key: string | null; preview_url: string | null }
  >
): Promise<Project[]> {
  const coverShots = [...coverShotByProject.values()];
  const withUrls = coverShots.length
    ? await withDisplayUrls(supabase, coverShots)
    : [];
  const coverUrlByShotId = new Map(
    withUrls.map((s) => [s.id, s.display_url])
  );

  return projects.map((p) => {
    const coverShot = coverShotByProject.get(p.id);
    return {
      ...p,
      photo_count: photoMap.get(p.id) ?? 0,
      selection_count: selMap.get(p.id) ?? 0,
      cover_url: coverShot
        ? coverUrlByShotId.get(coverShot.id) ?? null
        : null,
    };
  });
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS enforces personal owner or active team membership
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getProject", error.message);
    return null;
  }
  if (!data) return null;

  const project = data as Project;
  // Soft guard: personal projects only for owner
  if (
    (!project.owner_type || project.owner_type === "user") &&
    project.owner_id !== user.id
  ) {
    return null;
  }
  return project;
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
  const eventDateRaw = String(formData.get("event_date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const tags = parseProjectTags(String(formData.get("tags") ?? ""));
  const eventDate = parseEventDate(eventDateRaw);

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

  // Free-first plan limits (active projects)
  const { canCreateProject } = await import("@/actions/billing");
  const gate = await canCreateProject();
  if (!gate.ok) {
    return {
      error:
        "PROJECTS_LIMIT: Free includes 3 active projects. Upgrade or archive one to continue.",
    };
  }

  // Ensure profile exists (e.g. if trigger missed)
  await supabase.from("profiles").upsert({
    id: user.id,
    display_name:
      user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? null,
    studio_name: user.user_metadata?.studio_name ?? null,
  });

  const workspace = await getCurrentWorkspace();
  const insertRow: Record<string, unknown> = {
    title,
    client_name: clientName || null,
    selection_limit: Math.min(200, Math.max(1, selectionLimit)),
    status: "draft",
    ...(eventDate ? { event_date: eventDate } : {}),
    ...(location ? { location } : {}),
    ...(tags.length ? { tags } : {}),
  };

  if (workspace.kind === "team") {
    insertRow.owner_type = "team";
    insertRow.owner_id = workspace.teamId;
  } else {
    insertRow.owner_type = "user";
    insertRow.owner_id = user.id;
  }

  let { data: project, error } = await supabase
    .from("projects")
    .insert(insertRow)
    .select("id")
    .single();

  // Legacy DB without owner_type — personal only
  if (
    error &&
    (error.message.includes("owner_type") || error.code === "42703")
  ) {
    if (workspace.kind === "team") {
      return {
        error:
          "Team workspaces need supabase/features-teams.sql applied. Create personal projects until then.",
      };
    }
    const retry = await supabase
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
    project = retry.data;
    error = retry.error;
  }

  // Pre-migration: strip tags if column missing
  if (
    error &&
    (error.message.includes("tags") || error.code === "42703")
  ) {
    delete insertRow.tags;
    const retryTags = await supabase
      .from("projects")
      .insert(insertRow)
      .select("id")
      .single();
    project = retryTags.data;
    error = retryTags.error;
  }

  if (error || !project) {
    return { error: error?.message ?? "Failed to create project." };
  }

  // Default container for future uploads
  await supabase.from("containers").insert({
    project_id: project.id,
    name: "Main Gallery",
    sort_order: 0,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  redirect(`/dashboard/galleries/${project.id}`);
}

/** YYYY-MM-DD only; empty → null */
function parseEventDate(raw: string): string | null {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return raw;
}

/**
 * Update when/where the job happened — Memories metadata.
 */
export async function updateProjectMemory(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) return { error: "Missing project." };

  const eventDateRaw = String(formData.get("event_date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const eventDate = parseEventDate(eventDateRaw);

  // Allow clearing date: empty string → null
  if (eventDateRaw && !eventDate) {
    return { error: "Use a valid date." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const patch: Record<string, string | null> = {
    event_date: eventDate,
    location: location || null,
  };

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (
    error &&
    (error.message.includes("event_date") ||
      error.message.includes("location") ||
      error.code === "42703")
  ) {
    return {
      error:
        "Memory fields missing. Run supabase/features-project-memory.sql in the SQL Editor.",
    };
  }

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard/galleries");
  revalidatePath("/dashboard");
  return { success: "Saved event details." };
}

/**
 * Update core project settings (title, client, proofing limit).
 */
export async function updateProjectSettings(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) return { error: "Missing project." };

  const title = String(formData.get("title") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  const selectionLimit = Number(formData.get("limit") ?? 40) || 40;
  const eventDateRaw = String(formData.get("event_date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const tags = parseProjectTags(String(formData.get("tags") ?? ""));
  const eventDate = parseEventDate(eventDateRaw);

  if (!title) return { error: "Title is required." };
  if (eventDateRaw && !eventDate) return { error: "Use a valid event date." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const patch: Record<string, unknown> = {
    title,
    client_name: clientName || null,
    selection_limit: Math.min(200, Math.max(1, selectionLimit)),
    event_date: eventDate,
    location: location || null,
    tags,
  };

  let { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .eq("owner_id", user.id);

  // Pre-migration fallbacks (missing columns)
  if (error && (error.message.includes("tags") || error.code === "42703")) {
    const { tags: _t, ...withoutTags } = patch;
    void _t;
    const retry = await supabase
      .from("projects")
      .update(withoutTags)
      .eq("id", projectId)
      .eq("owner_id", user.id);
    error = retry.error;
    if (!error && tags.length) {
      return {
        error:
          "Tags column missing. Run supabase/features-project-tags.sql in the SQL Editor.",
      };
    }
  }

  if (
    error &&
    (error.message.includes("event_date") ||
      error.message.includes("location") ||
      error.code === "42703")
  ) {
    const retry = await supabase
      .from("projects")
      .update({
        title,
        client_name: clientName || null,
        selection_limit: Math.min(200, Math.max(1, selectionLimit)),
      })
      .eq("id", projectId)
      .eq("owner_id", user.id);
    error = retry.error;
  }

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard/galleries");
  revalidatePath("/dashboard");
  return { success: "Settings saved." };
}
