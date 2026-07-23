"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { emailFieldError } from "@/lib/email";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { preferredSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type OAuthProvider = "google" | "apple";

export type AuthFields = {
  email?: string;
  password?: string;
  studio?: string;
};

export type AuthState = {
  error?: string;
  success?: string;
  fields?: AuthFields;
};

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const studioName = String(formData.get("studio") ?? "").trim();
  const displayName =
    String(formData.get("display_name") ?? "").trim() ||
    studioName ||
    email.split("@")[0];

  const fields: AuthFields = {};
  const emailError = emailFieldError(email);
  if (emailError) fields.email = emailError;
  if (!password) fields.password = "Enter your password";
  else if (password.length < 6)
    fields.password = "Use at least 6 characters";

  if (fields.email || fields.password) {
    return { fields };
  }

  const slug = preferredSlug(studioName || null, email);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        studio_name: studioName || null,
        slug,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmations are off, session exists → dashboard.
  // If on, user must confirm first.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return {
    success:
      "Check your email to confirm your account, then log in. (If confirmations are disabled in Supabase, you can log in immediately.)",
  };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured. Add keys to .env.local — see supabase/SETUP.md",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const fields: AuthFields = {};
  const emailError = emailFieldError(email);
  if (emailError) fields.email = emailError;
  if (!password) fields.password = "Enter your password";

  if (fields.email || fields.password) {
    return { fields };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

function resolveAppOrigin(originFromClient?: string | null) {
  const o = (originFromClient ?? "").trim();
  if (o.startsWith("http://") || o.startsWith("https://")) {
    try {
      return new URL(o).origin;
    } catch {
      /* fall through */
    }
  }
  return getAppUrl().replace(/\/$/, "");
}

/**
 * Start Google / Apple OAuth (Triftly pattern: provider → redirectTo → callback session).
 * Redirects the browser to the IdP; return lands on /auth/callback.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  nextPath = "/dashboard",
  originFromClient?: string | null
) {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured. Add keys to .env.local — see supabase/SETUP.md",
    };
  }

  const next = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const origin = resolveAppOrigin(originFromClient);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // Skip offline prompt every time — smoother UX (Triftly-like)
      queryParams:
        provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }
  if (!data.url) {
    return { error: "Could not start social sign-in." };
  }

  redirect(data.url);
}

export async function signInWithGoogle(formData: FormData) {
  const next = String(formData.get("next") ?? "/dashboard");
  const origin = String(formData.get("origin") ?? "");
  return signInWithOAuth("google", next, origin);
}

export async function signInWithApple(formData: FormData) {
  const next = String(formData.get("next") ?? "/dashboard");
  const origin = String(formData.get("origin") ?? "");
  return signInWithOAuth("apple", next, origin);
}

/**
 * Link another provider to the *currently signed-in* account (same email / multi-IdP).
 * Requires Supabase "Manual linking" enabled — Triftly multi-provider model.
 */
export async function linkOAuthProvider(
  provider: OAuthProvider,
  originFromClient?: string | null
) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first, then link a provider." };

  const origin = resolveAppOrigin(originFromClient);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    "/dashboard/settings?linked=1"
  )}`;

  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo,
      queryParams:
        provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: "Could not start provider linking." };

  redirect(data.url);
}

export async function linkGoogle(formData: FormData) {
  return linkOAuthProvider("google", String(formData.get("origin") ?? ""));
}

export async function linkApple(formData: FormData) {
  return linkOAuthProvider("apple", String(formData.get("origin") ?? ""));
}

export async function unlinkOAuthProvider(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const identityId = String(formData.get("identity_id") ?? "").trim();
  if (!identityId) return { error: "Missing identity." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const identities = user.identities ?? [];
  if (identities.length <= 1) {
    return {
      error: "Keep at least one sign-in method. Add another before unlinking.",
    };
  }

  const identity = identities.find(
    (i) => i.identity_id === identityId || i.id === identityId
  );
  if (!identity) return { error: "Identity not found on this account." };

  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: `Unlinked ${identity.provider}.` };
}
