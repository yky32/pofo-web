"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isValidSlug, preferredSlug, slugFieldError, slugify } from "@/lib/slug";
import type { Profile } from "@/types/database";

export type ProfileActionState = {
  error?: string;
  success?: string;
  fields?: { slug?: string; studio?: string; display_name?: string };
};

export async function getMyProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getMyProfile", error.message);
    return null;
  }

  // Ensure slug for older accounts created before migration
  if (data && !data.slug) {
    const candidate = preferredSlug(
      data.studio_name,
      user.email
    );
    const claimed = await ensureUniqueSlug(supabase, candidate, user.id);
    if (claimed) {
      await supabase
        .from("profiles")
        .update({ slug: claimed })
        .eq("id", user.id);
      return { ...(data as Profile), slug: claimed };
    }
  }

  return data as Profile | null;
}

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeUserId?: string
): Promise<string | null> {
  let attempt = slugify(base) || "studio";
  if (!isValidSlug(attempt)) attempt = "studio";

  for (let i = 0; i < 50; i++) {
    const trySlug = i === 0 ? attempt : `${attempt.slice(0, 28)}-${i}`;
    if (!isValidSlug(trySlug) && i > 0) continue;

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", trySlug)
      .maybeSingle();
    if (!data || (excludeUserId && data.id === excludeUserId)) {
      return trySlug;
    }
  }
  return null;
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const studioName = String(formData.get("studio") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim().toLowerCase();

  const fields: ProfileActionState["fields"] = {};
  const slugErr = slugFieldError(slugRaw);
  if (slugErr) fields.slug = slugErr;
  if (Object.keys(fields).length) return { fields };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  // Uniqueness check
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", slugRaw)
    .neq("id", user.id)
    .maybeSingle();

  if (taken) {
    return { fields: { slug: "That studio link is already taken" } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      studio_name: studioName || null,
      display_name: displayName || null,
      slug: slugRaw,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { fields: { slug: "That studio link is already taken" } };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: "Studio profile saved." };
}

export async function getStudioBySlug(slug: string) {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_studio_by_slug", {
    p_slug: slug,
  });

  if (error) {
    console.error("getStudioBySlug", error.message);
    return null;
  }

  const payload = data as {
    error?: string;
    id?: string;
    slug?: string;
    display_name?: string | null;
    studio_name?: string | null;
    avatar_url?: string | null;
    portfolio_page?: unknown | null;
  };

  if (!payload || payload.error || !payload.slug) return null;
  return payload;
}
