"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import {
  clientShareEmailContent,
  isResendConfigured,
  sendEmail,
} from "@/lib/mail";
import { withDisplayUrls } from "@/lib/storage";
import { createShareToken } from "@/lib/tokens";
import {
  hashSharePassword,
  hasShareUnlock,
  setShareUnlockCookie,
  verifySharePassword,
} from "@/lib/share-password";
import type { ClientGalleryPayload, ShareLink } from "@/types/database";

export type ShareActionState = {
  error?: string;
  success?: string;
  token?: string;
  /**
   * One-time client reveal after create (Supabase-secret style).
   * Never persisted — only the hash is stored.
   */
  plain_password?: string;
};

/** Safe for photographer UI — never expose password_hash to the browser. */
export type ShareLinkPublic = Omit<ShareLink, "password_hash"> & {
  password_protected: boolean;
};

export async function listShareLinks(
  projectId: string
): Promise<ShareLinkPublic[]> {
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

  return (data ?? []).map((row) => {
    const { password_hash, ...rest } = row as ShareLink;
    return {
      ...rest,
      password_protected: Boolean(password_hash),
    } as ShareLinkPublic;
  });
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

  const passwordOn = String(formData.get("password_on") ?? "") === "1";
  const password = passwordOn
    ? String(formData.get("password") ?? "").trim()
    : "";

  if (passwordOn) {
    if (password.length < 4) {
      return { error: "Password must be at least 4 characters." };
    }
  }

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
    expires_at = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  // URL token stays random & unguessable. Password is stored only as one-way hash.
  const token = createShareToken();
  const password_hash = password ? hashSharePassword(password) : null;

  const { data: link, error } = await supabase
    .from("share_links")
    .insert({
      project_id: projectId,
      token,
      password_hash,
      is_active: true,
      expires_at,
    })
    .select("token")
    .single();

  if (error || !link) {
    return { error: error?.message ?? "Could not create share link." };
  }

  if (project.status === "draft") {
    await supabase
      .from("projects")
      .update({ status: "shared" })
      .eq("id", projectId);
  }

  revalidatePath(`/dashboard/galleries/${projectId}`);
  revalidatePath("/dashboard");
  return {
    success: password
      ? "Password-protected link created."
      : "Share link created.",
    token: link.token,
    // Echo once for UI copy — not stored in DB
    plain_password: password || undefined,
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

/**
 * Compensation: set a new password on an existing locked link (same URL).
 * Photographer types the password (same UX as create with toggle on).
 * Plain password returned once for copy reveal.
 */
export async function regenerateSharePassword(input: {
  projectId: string;
  linkId: string;
  /** Required — same as create-link password field */
  password: string;
}): Promise<ShareActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const projectId = input.projectId?.trim();
  const linkId = input.linkId?.trim();
  const plain = String(input.password ?? "").trim();
  if (!projectId || !linkId) return { error: "Missing link." };
  if (plain.length < 4) {
    return { error: "Password must be at least 4 characters." };
  }

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

  const { data: link, error: fetchErr } = await supabase
    .from("share_links")
    .select("id, token, is_active, password_hash")
    .eq("id", linkId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (fetchErr || !link) return { error: "Link not found." };
  if (!link.is_active) {
    return { error: "This link is revoked. Create a new link instead." };
  }
  if (!link.password_hash) {
    return { error: "This link is not password protected." };
  }

  const password_hash = hashSharePassword(plain);

  const { error } = await supabase
    .from("share_links")
    .update({ password_hash })
    .eq("id", linkId)
    .eq("project_id", projectId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/galleries/${projectId}`);
  return {
    success: "Password updated. Copy it now — it won’t be shown again.",
    token: link.token as string,
    plain_password: plain,
  };
}

export type ShareGateInfo =
  | {
      ok: true;
      requires_password: boolean;
      unlocked: boolean;
      project_title: string | null;
      client_name: string | null;
      studio_name: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }
  | { ok: false; error: string };

/** Lightweight gate check — no shots / no password_hash leaked. */
export async function getShareGate(token: string): Promise<ShareGateInfo> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "not_configured" };
  }
  if (!token || token.length < 8) {
    return { ok: false, error: "invalid_token" };
  }

  const supabase = await createClient();

  // Prefer public SECURITY DEFINER RPC (works with anon; no hash returned)
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "get_share_gate",
    { p_token: token }
  );

  if (!rpcErr && rpcData) {
    const row = rpcData as {
      error?: string;
      requires_password?: boolean;
      project_title?: string | null;
      client_name?: string | null;
      studio_name?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
    };
    if (row.error) return { ok: false, error: row.error };

    const requires = Boolean(row.requires_password);
    let unlocked = true;
    if (requires) {
      // Need current password_hash so regen invalidates old unlock cookies
      const admin = createAdminClient();
      const { data: secret } = admin
        ? await admin
            .from("share_links")
            .select("password_hash")
            .eq("token", token)
            .maybeSingle()
        : { data: null };
      unlocked = await hasShareUnlock(token, secret?.password_hash ?? null);
    }
    return {
      ok: true,
      requires_password: requires,
      unlocked,
      project_title: row.project_title ?? null,
      client_name: row.client_name ?? null,
      studio_name: row.studio_name ?? null,
      display_name: row.display_name ?? null,
      avatar_url: row.avatar_url ?? null,
    };
  }

  // Fallback: admin / session reads (older DBs without get_share_gate)
  const admin = createAdminClient();
  const db = admin ?? supabase;

  const { data: link, error } = await db
    .from("share_links")
    .select("id, token, password_hash, is_active, expires_at, project_id")
    .eq("token", token)
    .maybeSingle();

  if (error || !link) return { ok: false, error: "not_found" };
  if (!link.is_active) return { ok: false, error: "revoked" };
  if (link.expires_at && new Date(link.expires_at as string) < new Date()) {
    return { ok: false, error: "expired" };
  }

  const { data: project } = await db
    .from("projects")
    .select("title, client_name, owner_id")
    .eq("id", link.project_id)
    .maybeSingle();

  let studio_name: string | null = null;
  let display_name: string | null = null;
  let avatar_url: string | null = null;
  if (project?.owner_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("studio_name, display_name, avatar_url")
      .eq("id", project.owner_id)
      .maybeSingle();
    studio_name = profile?.studio_name || profile?.display_name || null;
    display_name = profile?.display_name ?? null;
    avatar_url = profile?.avatar_url ?? null;
  }

  const requires = Boolean(link.password_hash);
  const unlocked = requires
    ? await hasShareUnlock(token, link.password_hash)
    : true;
  return {
    ok: true,
    requires_password: requires,
    unlocked,
    project_title: project?.title ?? null,
    client_name: project?.client_name ?? null,
    studio_name,
    display_name,
    avatar_url,
  };
}

/** Client submits password → set unlock cookie. */
export async function unlockShareLink(
  token: string,
  password: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Gallery is not available." };
  }
  if (!token || !password.trim()) {
    return { error: "Enter the password." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "This gallery can’t unlock right now. Please try again later.",
    };
  }

  const { data: link, error } = await admin
    .from("share_links")
    .select("password_hash, is_active, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !link) return { error: "Link not found." };
  if (!link.is_active) return { error: "This link was revoked." };
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { error: "This link has expired." };
  }
  if (!link.password_hash) {
    // No password — treat as open
    await setShareUnlockCookie(token, null);
    return { ok: true };
  }

  if (!verifySharePassword(password, link.password_hash)) {
    return { error: "Incorrect password. Try again." };
  }

  await setShareUnlockCookie(token, link.password_hash);
  return { ok: true };
}

async function loadGalleryWithAdmin(
  token: string
): Promise<ClientGalleryPayload | { error: string }> {
  const admin = createAdminClient();
  if (!admin) return { error: "failed" };

  const { data: link } = await admin
    .from("share_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!link) return { error: "not_found" };
  if (!link.is_active) return { error: "revoked" };
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { error: "expired" };
  }

  const { data: project } = await admin
    .from("projects")
    .select("*")
    .eq("id", link.project_id)
    .maybeSingle();
  if (!project) return { error: "not_found" };

  const { data: profile } = await admin
    .from("profiles")
    .select("slug, studio_name, display_name")
    .eq("id", project.owner_id)
    .maybeSingle();

  const limit = project.selection_limit ?? 40;

  const { data: containers } = await admin
    .from("containers")
    .select("id")
    .eq("project_id", project.id)
    .eq("is_client_visible_default", true);

  const visibleContainerIds = new Set(
    (containers ?? []).map((c) => c.id as string)
  );

  const { data: shotsRaw } = await admin
    .from("shots")
    .select(
      "id, storage_key, preview_url, filename, sort_order, width, height, created_at, container_id"
    )
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  type ShotRow = {
    id: string;
    storage_key: string | null;
    preview_url: string | null;
    filename: string | null;
    sort_order: number;
    width: number | null;
    height: number | null;
    container_id: string;
  };

  const visible = ((shotsRaw ?? []) as ShotRow[]).filter(
    (s) =>
      visibleContainerIds.has(s.container_id) &&
      (s.preview_url || s.storage_key)
  );

  const withUrls = await withDisplayUrls(admin, visible);

  const { data: sels } = await admin
    .from("shot_selections")
    .select("shot_id")
    .eq("share_link_id", link.id);

  return {
    token: link.token,
    share_link_id: link.id,
    project: {
      id: project.id,
      title: project.title,
      client_name: project.client_name,
      description: project.description,
      status: project.status,
      selection_limit: limit,
    },
    studio: {
      slug: profile?.slug ?? null,
      studio_name: profile?.studio_name ?? null,
      display_name: profile?.display_name ?? null,
    },
    shots: withUrls.map((s) => ({
      id: s.id,
      storage_key: s.storage_key ?? null,
      preview_url: s.preview_url ?? null,
      display_url: s.display_url,
      filename: s.filename ?? null,
      sort_order: s.sort_order,
      width: s.width ?? null,
      height: s.height ?? null,
    })),
    selected_shot_ids: (sels ?? []).map((s) => s.shot_id as string),
  };
}

/** Public client gallery — password links require unlock cookie first. */
export async function getClientGalleryByToken(
  token: string,
  expectedSlug?: string | null
): Promise<ClientGalleryPayload | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "not_configured" };
  }

  const gate = await getShareGate(token);
  if (!gate.ok) return { error: gate.error };
  if (gate.requires_password && !gate.unlocked) {
    return { error: "password_required" };
  }

  // Password-protected: only serve via service role after cookie unlock
  // (anon RPC intentionally rejects passworded links — see schema).
  if (gate.requires_password) {
    const payload = await loadGalleryWithAdmin(token);
    if ("error" in payload) return payload;
    if (expectedSlug && payload.studio?.slug && payload.studio.slug !== expectedSlug) {
      return { error: "wrong_studio" };
    }
    void recordShareView(token);
    return payload;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_gallery", {
    p_token: token,
    p_expected_slug: expectedSlug ?? null,
  });

  if (error) {
    console.error("getClientGalleryByToken", error.message);
    if (error.message.includes("function") || error.code === "PGRST202") {
      return { error: "schema_missing" };
    }
    // Fallback single-arg RPC
    const { data: data2, error: e2 } = await supabase.rpc("get_client_gallery", {
      p_token: token,
    });
    if (e2 || !data2) return { error: "failed" };
    void recordShareView(token);
    return attachDisplayUrls(data2 as ClientGalleryPayload);
  }

  const payload = data as ClientGalleryPayload & { error?: string };
  if (payload?.error) {
    if (payload.error === "password_required") {
      return { error: "password_required" };
    }
    return { error: payload.error };
  }

  void recordShareView(token);
  return attachDisplayUrls(payload);
}

async function attachDisplayUrls(
  payload: ClientGalleryPayload
): Promise<ClientGalleryPayload> {
  const supabase = await createClient();
  const signer = createAdminClient() ?? supabase;
  const shots = await withDisplayUrls(signer, payload.shots ?? []);
  return {
    ...payload,
    shots: shots.map((s) => ({
      id: s.id,
      storage_key: s.storage_key ?? null,
      preview_url: s.preview_url ?? null,
      display_url: s.display_url,
      filename: s.filename ?? null,
      sort_order: s.sort_order,
      width: s.width ?? null,
      height: s.height ?? null,
    })),
  };
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

  // Block proofing mutations until password unlock
  const gate = await getShareGate(token);
  if (!gate.ok) return { error: gate.error };
  if (gate.requires_password && !gate.unlocked) {
    return { error: "password_required" };
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

/**
 * Increment share_link view_count (best-effort). Call once per successful open.
 */
export async function recordShareView(token: string): Promise<void> {
  if (!isSupabaseConfigured() || !token || token.length < 8) return;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_share_view", {
      p_token: token,
    });
    if (error) {
      // Older DBs without the RPC — ignore
      if (
        !error.message.includes("function") &&
        error.code !== "PGRST202"
      ) {
        console.error("recordShareView", error.message);
      }
    }
  } catch (e) {
    console.error("recordShareView", e);
  }
}

/**
 * Email the client a gallery link.
 * Uses Resend when configured; otherwise returns a mailto: URL for the browser.
 */
export async function emailClientShare(input: {
  projectId: string;
  linkId: string;
  to: string;
  /** Optional one-time password to include (only if photographer still has it) */
  password?: string | null;
}): Promise<{
  ok?: boolean;
  error?: string;
  /** When Resend is not set — open this in the browser */
  mailto?: string;
  sent_via?: "resend" | "mailto";
}> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const projectId = input.projectId?.trim();
  const linkId = input.linkId?.trim();
  const to = input.to?.trim().toLowerCase();
  if (!projectId || !linkId) return { error: "Missing link." };
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_name, owner_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const { data: link } = await supabase
    .from("share_links")
    .select("id, token, is_active, expires_at, password_hash")
    .eq("id", linkId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!link || !link.is_active) return { error: "Link not found or revoked." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_name, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const studioName =
    profile?.studio_name || profile?.display_name || "Your photographer";
  const galleryUrl = `${getAppUrl()}/g/${link.token}`;
  const expiresLabel = link.expires_at
    ? new Date(link.expires_at as string).toLocaleDateString()
    : null;

  // Only include password if photographer explicitly passes it (one-time reveal flow)
  const password =
    input.password?.trim() && link.password_hash
      ? input.password.trim()
      : null;

  const content = clientShareEmailContent({
    studioName,
    projectTitle: project.title as string,
    galleryUrl,
    password,
    expiresLabel,
  });

  if (isResendConfigured()) {
    const sent = await sendEmail({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (!sent.ok) {
      return {
        error:
          sent.error === "email_not_configured"
            ? "Email is not configured."
            : "Could not send email. Try again or use your mail app.",
      };
    }

    await supabase
      .from("share_links")
      .update({
        last_email_to: to,
        last_email_at: new Date().toISOString(),
      })
      .eq("id", linkId)
      .eq("project_id", projectId);

    revalidatePath(`/dashboard/galleries/${projectId}`);
    return { ok: true, sent_via: "resend" };
  }

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(content.text)}`;

  // Still track intent when falling back to mailto
  await supabase
    .from("share_links")
    .update({
      last_email_to: to,
      last_email_at: new Date().toISOString(),
    })
    .eq("id", linkId)
    .eq("project_id", projectId);

  revalidatePath(`/dashboard/galleries/${projectId}`);
  return { ok: true, sent_via: "mailto", mailto };
}
