"use server";

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

/**
 * Start Google / Apple OAuth (same pattern as Triftly → Supabase OAuth provider).
 * Redirects the browser to the IdP; return lands on /auth/callback.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  nextPath = "/dashboard"
) {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured. Add keys to .env.local — see supabase/SETUP.md",
    };
  }

  const next = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams:
        provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : undefined,
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
  return signInWithOAuth("google", next);
}

export async function signInWithApple(formData: FormData) {
  const next = String(formData.get("next") ?? "/dashboard");
  return signInWithOAuth("apple", next);
}
