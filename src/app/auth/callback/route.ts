import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * OAuth PKCE callback (Triftly-style: provider → redirectTo → exchange code).
 * Supabase redirects here after Google / Apple sign-in.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";
  const err = searchParams.get("error");
  const errDesc = searchParams.get("error_description");

  if (err) {
    const login = new URL("/login", origin);
    login.searchParams.set(
      "error",
      errDesc || err || "Social sign-in was cancelled"
    );
    return NextResponse.redirect(login);
  }

  if (!code || !isSupabaseConfigured()) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "Missing auth code. Try again.");
    return NextResponse.redirect(login);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", error.message);
    return NextResponse.redirect(login);
  }

  // Ensure profile exists (trigger usually fires; upsert for safety)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = user.user_metadata ?? {};
    const display =
      (meta.display_name as string | undefined) ||
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      user.email?.split("@")[0] ||
      null;
    const avatar =
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined) ||
      null;

    // Trigger usually created the row; fill name/avatar without clobbering slug.
    await supabase
      .from("profiles")
      .update({
        display_name: display,
        avatar_url: avatar,
      })
      .eq("id", user.id)
      .is("display_name", null);

    if (avatar) {
      await supabase
        .from("profiles")
        .update({ avatar_url: avatar })
        .eq("id", user.id)
        .is("avatar_url", null);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
