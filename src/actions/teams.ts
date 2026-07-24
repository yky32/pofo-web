"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  isValidSlug,
  preferredSlug,
  slugFieldError,
  slugify,
} from "@/lib/slug";
import {
  getWorkspaceCookie,
  setWorkspaceCookie,
  type WorkspaceCookieValue,
} from "@/lib/workspace";
import type { Team, TeamMemberRole, WorkspaceContext } from "@/types/database";

export type TeamActionState = {
  error?: string;
  success?: string;
  fields?: { name?: string; slug?: string };
  teamId?: string;
};

async function ensureUniqueTeamSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeTeamId?: string
): Promise<string | null> {
  let attempt = slugify(base) || "studio";
  if (!isValidSlug(attempt)) attempt = "studio";

  for (let i = 0; i < 50; i++) {
    const trySlug = i === 0 ? attempt : `${attempt.slice(0, 28)}-${i}`;
    if (!isValidSlug(trySlug) && i > 0) continue;

    // Collision with another team
    const { data: teamHit } = await supabase
      .from("teams")
      .select("id")
      .eq("slug", trySlug)
      .maybeSingle();
    if (teamHit && teamHit.id !== excludeTeamId) continue;

    // Soft collision with personal brand (avoid public brand clash)
    const { data: profileHit } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", trySlug)
      .maybeSingle();
    if (profileHit) continue;

    return trySlug;
  }
  return null;
}

/** Teams the current user actively belongs to. */
export async function listMyTeams(): Promise<Team[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error } = await supabase
    .from("team_members")
    .select("team_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    // Table not migrated yet
    if (
      error.message.includes("team_members") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    console.error("listMyTeams memberships", error.message);
    return [];
  }

  if (!memberships?.length) return [];

  const teamIds = memberships.map((m) => m.team_id as string);
  const roleByTeam = new Map(
    memberships.map((m) => [m.team_id as string, m.role as TeamMemberRole])
  );

  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("*")
    .in("id", teamIds)
    .order("name", { ascending: true });

  if (tErr) {
    console.error("listMyTeams teams", tErr.message);
    return [];
  }

  return (teams ?? []).map((t) => ({
    ...(t as Team),
    my_role: roleByTeam.get(t.id as string),
  }));
}

export async function getCurrentWorkspace(): Promise<WorkspaceContext> {
  const cookie = await getWorkspaceCookie();
  if (cookie.kind === "personal") return { kind: "personal" };

  const teams = await listMyTeams();
  const team = teams.find((t) => t.id === cookie.teamId);
  if (!team) {
    // Stale cookie — fall back to personal
    await setWorkspaceCookie({ kind: "personal" });
    return { kind: "personal" };
  }
  return {
    kind: "team",
    teamId: team.id,
    teamName: team.name,
    teamSlug: team.slug,
  };
}

export async function setCurrentWorkspace(
  value: WorkspaceCookieValue
): Promise<{ ok?: boolean; error?: string }> {
  if (value.kind === "team") {
    const teams = await listMyTeams();
    if (!teams.some((t) => t.id === value.teamId)) {
      return { error: "You are not a member of that studio." };
    }
  }
  await setWorkspaceCookie(value);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galleries");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/**
 * Create a studio team workspace + owner membership under the current user.
 * Does not affect personal projects.
 */
export async function createTeam(input: {
  name: string;
  slug?: string;
  switchTo?: boolean;
}): Promise<TeamActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { fields: { name: "Enter a studio name (at least 2 characters)." } };
  }

  const slugRaw = (input.slug?.trim() || preferredSlug(name, null)).toLowerCase();
  const slugErr = slugFieldError(slugRaw);
  if (slugErr) return { fields: { slug: slugErr } };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: user.id,
    display_name:
      user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? null,
  });

  const claimed = await ensureUniqueTeamSlug(supabase, slugRaw);
  if (!claimed) {
    return { fields: { slug: "Could not allocate a unique studio link." } };
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name,
      slug: claimed,
      created_by: user.id,
    })
    .select("id, name, slug")
    .single();

  if (error || !team) {
    if (
      error?.message.includes("teams") ||
      error?.code === "42P01" ||
      error?.code === "PGRST205"
    ) {
      return {
        error:
          "Team tables are not set up yet. Run supabase/features-teams.sql in the SQL Editor.",
      };
    }
    if (error?.code === "23505") {
      return { fields: { slug: "That studio link is already taken." } };
    }
    return { error: error?.message ?? "Could not create studio." };
  }

  const { error: memErr } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memErr) {
    // Best-effort cleanup
    await supabase.from("teams").delete().eq("id", team.id);
    return { error: memErr.message };
  }

  if (input.switchTo !== false) {
    await setWorkspaceCookie({ kind: "team", teamId: team.id as string });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/galleries");
  return {
    success: `Studio “${name}” created.`,
    teamId: team.id as string,
  };
}

/**
 * After team-intent signup (email or OAuth), create team from metadata if needed.
 */
export async function ensureTeamFromSignupMetadata(): Promise<TeamActionState> {
  if (!isSupabaseConfigured()) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const meta = user.user_metadata ?? {};
  if (meta.account_intent !== "team") return {};

  // Already has a team?
  const existing = await listMyTeams();
  if (existing.length > 0) {
    await setWorkspaceCookie({ kind: "team", teamId: existing[0].id });
    return { success: "Studio ready.", teamId: existing[0].id };
  }

  const teamName =
    String(meta.team_name ?? meta.studio_name ?? "").trim() ||
    String(meta.display_name ?? "").trim() ||
    "My Studio";
  const teamSlug = String(meta.team_slug ?? "").trim() || undefined;

  return createTeam({
    name: teamName,
    slug: teamSlug,
    switchTo: true,
  });
}
