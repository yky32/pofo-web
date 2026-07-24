import { NextResponse } from "next/server";
import {
  avatarFromMetadata,
  displayNameFromMetadata,
  providerIdsFromUser,
} from "@/lib/auth-identities";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth PKCE callback — sign-in *or* linkIdentity return.
 *
 * Workspace intent is NOT stored in cookies. It travels in the URL:
 *   /auth/callback?code=…&next=/dashboard/onboarding/studio   (team signup)
 *   /auth/callback?code=…&next=/dashboard                     (personal / login)
 *
 * Supabase redirectTo is set to that full callback URL when starting OAuth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const err = searchParams.get("error");
  const errDesc = searchParams.get("error_description");
  const isLinkFlow = next.includes("/dashboard/settings");

  const failRedirect = (message: string) => {
    const url = new URL(
      isLinkFlow ? "/dashboard/settings" : "/login",
      origin
    );
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  };

  if (err) {
    return failRedirect(errDesc || err || "Social sign-in was cancelled");
  }

  if (!code || !isSupabaseConfigured()) {
    return failRedirect("Missing auth code. Try again.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return failRedirect(error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const display = displayNameFromMetadata(meta, user.email);
    const avatar = avatarFromMetadata(meta);

    // Never wipe custom studio name / slug on OAuth re-auth or link.
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const patch: {
        display_name?: string;
        avatar_url?: string;
        providers?: string[];
      } = {
        providers: providerIdsFromUser(user),
      };
      if (!profile.display_name && display) patch.display_name = display;
      if (!profile.avatar_url && avatar) patch.avatar_url = avatar;
      await supabase.from("profiles").update(patch).eq("id", user.id);
    } else {
      await supabase.rpc("sync_profile_providers", { p_user_id: user.id });
    }
  }

  // Honor next from query string (team → /dashboard/onboarding/studio)
  return NextResponse.redirect(new URL(next, origin));
}

/** Only same-origin relative paths — blocks open redirects */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  // Allow optional query on next, e.g. /dashboard/onboarding/studio?from=oauth
  try {
    const u = new URL(raw, "http://local.invalid");
    if (u.pathname.includes("..")) return "/dashboard";
    return `${u.pathname}${u.search}`;
  } catch {
    return "/dashboard";
  }
}
