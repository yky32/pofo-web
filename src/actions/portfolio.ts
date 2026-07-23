"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
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
 * Publish proofed (or any) shots to the photographer's public portfolio.
 */
export async function publishShotsToPortfolio(input: {
  projectId: string;
  shotIds: string[];
  markProjectFinal?: boolean;
}): Promise<PortfolioActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const ids = [...new Set(input.shotIds.filter(Boolean))];
  if (!ids.length) return { error: "Select at least one photo." };
  if (ids.length > 100) return { error: "Publish at most 100 photos at a time." };

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
    .select("id, filename")
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

  const { count } = await supabase
    .from("portfolio_items")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const sortBase = count ?? 0;
  const rows = shots.map((s, i) => ({
    owner_id: user.id,
    shot_id: s.id as string,
    project_id: input.projectId,
    title: (s.filename as string) || project.title,
    is_published: true,
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

  // Soft mark as final kind for delivered selection
  await supabase
    .from("shots")
    .update({ kind: "final" })
    .eq("project_id", input.projectId)
    .eq("owner_id", user.id)
    .in(
      "id",
      shots.map((s) => s.id as string)
    );

  if (input.markProjectFinal) {
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
  return {
    success: `Published ${shots.length} photo${shots.length === 1 ? "" : "s"} to portfolio.`,
    published: shots.length,
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
