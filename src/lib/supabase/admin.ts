import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for short-lived signed URLs after share-token checks.
 * Optional: without it, client gallery falls back to whatever preview_url is stored.
 * Never import this in client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || key === "your-service-role-key") {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasServiceRole() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(key && key !== "your-service-role-key");
}
