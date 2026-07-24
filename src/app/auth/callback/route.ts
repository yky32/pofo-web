import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  avatarFromMetadata,
  displayNameFromMetadata,
  providerIdsFromUser,
} from "@/lib/auth-identities";
import { isSupabaseConfigured } from "@/lib/env";
import {
  parseSignupIntent,
  SIGNUP_INTENT_COOKIE,
} from "@/lib/signup-intent";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth PKCE callback — sign-in *or* linkIdentity return.
 * Multi-provider: same auth.users id gains another auth.identities row.
 *
 * Signup intent (personal | team) is read from cookie set on /signup so
 * Google/Apple know workspace type even though OAuth can't send form fields.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  let next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";
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

    // Team signup via Google/Apple: cookie intent → studio onboarding
    // Skip if already a team member or linking providers in settings
    if (!isLinkFlow) {
      const jar = await cookies();
      const intent = parseSignupIntent(
        jar.get(SIGNUP_INTENT_COOKIE)?.value
      );
      if (intent === "team") {
        try {
          const { data: memberships } = await supabase
            .from("team_members")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .limit(1);
          if (!memberships?.length) {
            next = "/dashboard/onboarding/studio";
          }
        } catch {
          next = "/dashboard/onboarding/studio";
        }
        // One-shot: clear intent so later logins stay personal default
        jar.set(SIGNUP_INTENT_COOKIE, "", {
          path: "/",
          maxAge: 0,
        });
      }
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
