import { DashboardShell } from "@/components/dashboard-shell";
import type { DashboardUser } from "@/components/dashboard-user-menu";
import {
  avatarFromMetadata,
  displayNameFromMetadata,
  identitiesFromUser,
  primaryProvider,
} from "@/lib/auth-identities";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

async function loadDashboardUser(): Promise<DashboardUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, studio_name")
      .eq("id", user.id)
      .maybeSingle();

    const identities = identitiesFromUser(user);

    return {
      email: user.email,
      displayName:
        profile?.display_name ||
        profile?.studio_name ||
        displayNameFromMetadata(meta, user.email),
      avatarUrl: profile?.avatar_url || avatarFromMetadata(meta),
      // Prefer IdP on the session (Triftly: identities → google/apple/email)
      signInProvider: primaryProvider(identities),
    };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  const user = await loadDashboardUser();

  return (
    <DashboardShell demoMode={!configured} user={user}>
      {children}
    </DashboardShell>
  );
}
