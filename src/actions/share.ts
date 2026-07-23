"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createShareToken } from "@/lib/tokens";
import type { ClientGalleryPayload, ShareLink } from "@/types/database";

export type ShareActionState = {
  error?: string;
  success?: string;
  token?: string;
};

export async function listShareLinks(
  projectId: string
): Promise<ShareLink[]> {
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

  const { data, error } = await supabase
    .from("share_links")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listShareLinks", error.message);
    return [];
  }

  return (data ?? []) as ShareLink[];
}

export async function createShareLink(
  _prev: ShareActionState,
  formData: FormData
): Promise<ShareActionState> {
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
    .select("id, status, owner_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return { error: "Project not found." };

  const expiresDaysRaw = String(formData.get("expires_days") ?? "").trim();
  let expires_at: string | null = null;
  if (expiresDaysRaw && expiresDaysRaw !== "0") {
    const days = Math.min(365, Math.max(1, Number(expiresDaysRaw) || 30));
    expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  const token = createShareToken();
  const { data: link, error } = await supabase
    .from("share_links")
    .insert({
      project_id: projectId,
      token,
      is_active: true,
      allow_download: true,
      expires_at,
    })
    .select("token")
    .single();

  if (error || !link) {
    return { error: error?.message ?? "Could not create share link." };
  }

  // Soft status: share → shared (unless already proofing/final)
  if (project.status === "draft") {
    await supabase
      .from("projects")
      .update({ status: "shared" })
      .eq("id", projectId);
  }

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard");
  return {
    success: "Share link created.",
    token: link.token,
  };
}

export async function revokeShareLink(
  _prev: ShareActionState,
  formData: FormData
): Promise<ShareActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const linkId = String(formData.get("link_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!linkId || !projectId) return { error: "Missing link." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const { error } = await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("id", linkId)
    .eq("project_id", projectId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  return { success: "Link revoked." };
}

/** Public client gallery via SECURITY DEFINER RPC (works with anon key). */
export async function getClientGalleryByToken(
  token: string
): Promise<ClientGalleryPayload | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "not_configured" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_gallery", {
    p_token: token,
  });

  if (error) {
    console.error("getClientGalleryByToken", error.message);
    // Likely schema not applied yet
    if (error.message.includes("function") || error.code === "PGRST202") {
      return { error: "schema_missing" };
    }
    return { error: "failed" };
  }

  const payload = data as ClientGalleryPayload & { error?: string };
  if (payload?.error) return { error: payload.error };
  return payload;
}

export async function toggleClientSelection(
  token: string,
  shotId: string
): Promise<{
  ok?: boolean;
  error?: string;
  selected_shot_ids?: string[];
  selected_count?: number;
  selection_limit?: number;
}> {
  if (!isSupabaseConfigured()) {
    return { error: "not_configured" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_client_selection", {
    p_token: token,
    p_shot_id: shotId,
  });

  if (error) {
    console.error("toggleClientSelection", error.message);
    return { error: "failed" };
  }

  return data as {
    ok?: boolean;
    error?: string;
    selected_shot_ids?: string[];
    selected_count?: number;
    selection_limit?: number;
  };
}
