"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import {
  parsePortfolioPage,
  type PortfolioPageConfig,
} from "@/lib/portfolio-page";
import { withDisplayUrls } from "@/lib/storage";
import type { StudioPublic } from "@/types/database";

export type PortfolioActionState = {
  error?: string;
  success?: string;
  published?: number;
};

export type PortfolioItemRow = {
  id: string;
  shot_id: string;
  project_id: string | null;
  title: string | null;
  caption: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  display_url: string | null;
  filename: string | null;
  project_title?: string | null;
};

export async function listMyPortfolio(): Promise<PortfolioItemRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("portfolio_items")
    .select(
      "id, shot_id, project_id, title, caption, is_published, sort_order, created_at"
    )
    .eq("owner_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    // Table missing until features-p3.sql
    if (
      error.message.includes("portfolio_items") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    console.error("listMyPortfolio", error.message);
    return [];
  }

  const rows = data ?? [];
  if (!rows.length) return [];

  const shotIds = rows.map((r) => r.shot_id as string);
  const projectIds = [
    ...new Set(
      rows
        .map((r) => r.project_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: shots } = await supabase
    .from("shots")
    .select("id, storage_key, preview_url, filename")
    .in("id", shotIds);

  const projectTitleById = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title")
      .in("id", projectIds);
    for (const p of projects ?? []) {
      projectTitleById.set(p.id as string, p.title as string);
    }
  }

  const shotById = new Map(
    (shots ?? []).map((s) => [
      s.id as string,
      s as {
        id: string;
        storage_key: string | null;
        preview_url: string | null;
        filename: string | null;
      },
    ])
  );

  const withUrls = await withDisplayUrls(
    supabase,
    shotIds.map((id) => {
      const s = shotById.get(id);
      return {
        id,
        storage_key: s?.storage_key ?? null,
        preview_url: s?.preview_url ?? null,
      };
    })
  );
  const urlByShot = new Map(withUrls.map((s) => [s.id, s.display_url]));

  return rows.map((r) => {
    const s = shotById.get(r.shot_id as string);
    return {
      id: r.id as string,
      shot_id: r.shot_id as string,
      project_id: (r.project_id as string | null) ?? null,
      title: (r.title as string | null) ?? s?.filename ?? null,
      caption: (r.caption as string | null) ?? null,
      is_published: Boolean(r.is_published),
      sort_order: (r.sort_order as number) ?? 0,
      created_at: r.created_at as string,
      display_url: urlByShot.get(r.shot_id as string) ?? null,
      filename: s?.filename ?? null,
      project_title: r.project_id
        ? projectTitleById.get(r.project_id as string) ?? null
        : null,
    };
  });
}

/**
 * Add any owned project shots to the public portfolio (not only client picks).
 * Showcase frames that represent the photographer’s work.
 */
export async function publishShotsToPortfolio(input: {
  projectId: string;
  shotIds: string[];
  /** When true (proofing finish flow): mark shots final + project final */
  markProjectFinal?: boolean;
  /** Default true — live on public page immediately */
  publishLive?: boolean;
}): Promise<PortfolioActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const ids = [...new Set(input.shotIds.filter(Boolean))];
  if (!ids.length) return { error: "Select at least one photo." };
  if (ids.length > 100) return { error: "Add at most 100 photos at a time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", input.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const { data: shots, error: sErr } = await supabase
    .from("shots")
    .select("id, filename, kind")
    .eq("project_id", input.projectId)
    .eq("owner_id", user.id)
    .in("id", ids);

  if (sErr) {
    if (sErr.message.includes("portfolio") || sErr.code === "42P01") {
      return {
        error: "Run supabase/features-p3.sql in the SQL Editor first.",
      };
    }
    return { error: sErr.message };
  }
  if (!shots?.length) return { error: "No matching photos." };

  // Prefer displayable frames — skip pure RAW without preview when possible
  const usable = shots.filter((s) => {
    const kind = (s as { kind?: string | null }).kind;
    return kind !== "raw";
  });
  const toAdd = usable.length ? usable : shots;

  const { count } = await supabase
    .from("portfolio_items")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const sortBase = count ?? 0;
  const live = input.publishLive !== false;
  const rows = toAdd.map((s, i) => ({
    owner_id: user.id,
    shot_id: s.id as string,
    project_id: input.projectId,
    title: (s.filename as string) || (project.title as string),
    is_published: live,
    sort_order: sortBase + i,
  }));

  const { error } = await supabase.from("portfolio_items").upsert(rows, {
    onConflict: "owner_id,shot_id",
    ignoreDuplicates: false,
  });

  if (error) {
    if (
      error.message.includes("portfolio_items") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return {
        error: "Run supabase/features-p3.sql in the SQL Editor first.",
      };
    }
    return { error: error.message };
  }

  // Only when finishing a delivery — not for general showcase adds
  if (input.markProjectFinal) {
    await supabase
      .from("shots")
      .update({ kind: "final" })
      .eq("project_id", input.projectId)
      .eq("owner_id", user.id)
      .in(
        "id",
        toAdd.map((s) => s.id as string)
      );

    await supabase
      .from("projects")
      .update({ status: "final", updated_at: new Date().toISOString() })
      .eq("id", input.projectId)
      .eq("owner_id", user.id);
  }

  revalidatePath("/dashboard/portfolio");
  revalidatePath(`/dashboard/galleries/${input.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/s");
  revalidatePath("/s", "layout");
  return {
    success: `Added ${toAdd.length} photo${toAdd.length === 1 ? "" : "s"} to portfolio.`,
    published: toAdd.length,
  };
}

export type PortfolioCandidateShot = {
  id: string;
  project_id: string;
  project_title: string;
  filename: string | null;
  display_url: string | null;
  in_portfolio: boolean;
};

/** Projects with displayable shots for portfolio picker. */
export async function listPortfolioCandidates(): Promise<{
  projects: { id: string; title: string; shot_count: number }[];
  shots: PortfolioCandidateShot[];
  portfolio_shot_ids: string[];
}> {
  const empty = {
    projects: [] as { id: string; title: string; shot_count: number }[],
    shots: [] as PortfolioCandidateShot[],
    portfolio_shot_ids: [] as string[],
  };
  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (!projects?.length) return empty;

  const projectIds = projects.map((p) => p.id as string);
  const titleById = new Map(
    projects.map((p) => [p.id as string, p.title as string])
  );

  const { data: shots } = await supabase
    .from("shots")
    .select(
      "id, project_id, filename, storage_key, preview_url, preview_key, thumbnail_key, kind"
    )
    .eq("owner_id", user.id)
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true })
    .limit(500);

  const { data: existing } = await supabase
    .from("portfolio_items")
    .select("shot_id")
    .eq("owner_id", user.id);

  const inPortfolio = new Set(
    (existing ?? []).map((r) => r.shot_id as string)
  );

  const rows = (shots ?? []).filter((s) => {
    const kind = (s as { kind?: string | null }).kind;
    if (kind === "raw") return false;
    return Boolean(
      s.preview_url ||
        s.storage_key ||
        (s as { preview_key?: string | null }).preview_key ||
        (s as { thumbnail_key?: string | null }).thumbnail_key
    );
  });

  const withUrls = await withDisplayUrls(
    supabase,
    rows.map((s) => ({
      id: s.id as string,
      storage_key: (s.storage_key as string | null) ?? null,
      preview_url: (s.preview_url as string | null) ?? null,
      preview_key:
        ((s as { preview_key?: string | null }).preview_key as
          | string
          | null) ?? null,
      thumbnail_key:
        ((s as { thumbnail_key?: string | null }).thumbnail_key as
          | string
          | null) ?? null,
    }))
  );
  const urlById = new Map(withUrls.map((s) => [s.id, s.display_url]));

  const candidates: PortfolioCandidateShot[] = rows.map((s) => ({
    id: s.id as string,
    project_id: s.project_id as string,
    project_title: titleById.get(s.project_id as string) ?? "Project",
    filename: (s.filename as string | null) ?? null,
    display_url: urlById.get(s.id as string) ?? null,
    in_portfolio: inPortfolio.has(s.id as string),
  }));

  const countByProject = new Map<string, number>();
  for (const c of candidates) {
    countByProject.set(
      c.project_id,
      (countByProject.get(c.project_id) ?? 0) + 1
    );
  }

  return {
    projects: projects
      .map((p) => ({
        id: p.id as string,
        title: p.title as string,
        shot_count: countByProject.get(p.id as string) ?? 0,
      }))
      .filter((p) => p.shot_count > 0),
    shots: candidates,
    portfolio_shot_ids: [...inPortfolio],
  };
}

export async function setPortfolioItemPublished(input: {
  itemId: string;
  published: boolean;
}): Promise<PortfolioActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("portfolio_items")
    .update({ is_published: input.published })
    .eq("id", input.itemId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/portfolio");
  revalidatePath("/s", "layout");
  return {
    success: input.published ? "Published." : "Hidden from public portfolio.",
  };
}

export async function removePortfolioItem(itemId: string): Promise<PortfolioActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", itemId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/portfolio");
  revalidatePath("/s", "layout");
  return { success: "Removed from portfolio." };
}

export type PublicPortfolioItem = {
  id: string;
  title: string | null;
  caption: string | null;
  shot_id: string;
  display_url: string | null;
  filename: string | null;
  project_title: string | null;
  width: number | null;
  height: number | null;
};

export type PublicPortfolio = {
  studio: StudioPublic;
  items: PublicPortfolioItem[];
};

/** Load layout for the logged-in photographer (defaults if unset). */
export async function getMyPortfolioPage(): Promise<PortfolioPageConfig> {
  if (!isSupabaseConfigured()) {
    return parsePortfolioPage(null);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return parsePortfolioPage(null);

  const { data } = await supabase
    .from("profiles")
    .select("studio_name, display_name, portfolio_page")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    (data as { studio_name?: string | null; display_name?: string | null } | null)
      ?.studio_name ||
    (data as { display_name?: string | null } | null)?.display_name;

  return parsePortfolioPage(
    (data as { portfolio_page?: unknown } | null)?.portfolio_page,
    name
  );
}

/** Persist limited page layout (theme + ordered sections). */
export async function savePortfolioPage(
  config: PortfolioPageConfig
): Promise<PortfolioActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_name, display_name, slug")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.studio_name || profile?.display_name || profile?.slug || null;
  const clean = parsePortfolioPage(config, name);

  const { error } = await supabase
    .from("profiles")
    .update({ portfolio_page: clean })
    .eq("id", user.id);

  if (error) {
    if (
      error.message.includes("portfolio_page") ||
      error.code === "42703" ||
      error.code === "PGRST204"
    ) {
      return {
        error:
          "Run supabase/features-portfolio-page.sql in the SQL Editor first.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/portfolio");
  revalidatePath("/s", "layout");
  if (profile?.slug) {
    revalidatePath(`/s/${profile.slug}`);
  }
  return { success: "Page design saved." };
}

export async function getPublicPortfolio(
  slug: string
): Promise<PublicPortfolio | { error: string }> {
  if (!isSupabaseConfigured()) return { error: "not_configured" };
  if (!slug?.trim()) return { error: "invalid_slug" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_portfolio", {
    p_slug: slug.trim().toLowerCase(),
  });

  if (error) {
    if (error.message.includes("function") || error.code === "PGRST202") {
      return { error: "schema_missing" };
    }
    console.error("getPublicPortfolio", error.message);
    return { error: "failed" };
  }

  const payload = data as {
    error?: string;
    studio?: StudioPublic;
    items?: {
      id: string;
      title: string | null;
      caption: string | null;
      shot_id: string;
      storage_key: string | null;
      preview_url: string | null;
      filename: string | null;
      project_title: string | null;
      width: number | null;
      height: number | null;
    }[];
  };

  if (payload?.error) return { error: payload.error };
  if (!payload?.studio) return { error: "not_found" };

  const signer = createAdminClient() ?? supabase;
  const raw = payload.items ?? [];
  const withUrls = await withDisplayUrls(
    signer,
    raw.map((i) => ({
      id: i.shot_id,
      storage_key: i.storage_key,
      preview_url: i.preview_url,
    }))
  );
  const urlById = new Map(withUrls.map((s) => [s.id, s.display_url]));

  return {
    studio: payload.studio,
    items: raw.map((i) => ({
      id: i.id,
      title: i.title,
      caption: i.caption,
      shot_id: i.shot_id,
      display_url: urlById.get(i.shot_id) ?? i.preview_url,
      filename: i.filename,
      project_title: i.project_title,
      width: i.width,
      height: i.height,
    })),
  };
}
