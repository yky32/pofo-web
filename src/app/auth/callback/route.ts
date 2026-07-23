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
 * Multi-provider: same auth.users id gains another auth.identities row.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";
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
    // Only fill empty profile fields (Triftly display-name preference).
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
        // Keep denormalized providers[] in sync after sign-in / link
        providers: providerIdsFromUser(user),
      };
      if (!profile.display_name && display) patch.display_name = display;
      if (!profile.avatar_url && avatar) patch.avatar_url = avatar;
      await supabase.from("profiles").update(patch).eq("id", user.id);
    } else {
      // Trigger usually creates the row; still try providers via RPC if available
      await supabase.rpc("sync_profile_providers", { p_user_id: user.id });
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
