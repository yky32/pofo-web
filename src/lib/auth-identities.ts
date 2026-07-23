/**
 * Multi-provider identity helpers (Triftly-style).
 * Source of truth: Supabase Auth `user.identities` + app_metadata — not public.profiles.
 */

export type AuthProviderId = "google" | "apple" | "email" | "phone" | string;

export type LinkedIdentity = {
  id: string;
  provider: AuthProviderId;
  email?: string | null;
  createdAt?: string | null;
};

type AuthIdentityLike = {
  id?: string;
  identity_id?: string;
  provider?: string;
  email?: string;
  created_at?: string;
  identity_data?: { email?: string; [key: string]: unknown };
};

type AuthUserLike = {
  id: string;
  email?: string | null;
  identities?: AuthIdentityLike[] | null;
  app_metadata?: { provider?: string; providers?: string[] };
  user_metadata?: Record<string, unknown> | null;
};

export function identitiesFromUser(user: AuthUserLike | null | undefined): LinkedIdentity[] {
  if (!user) return [];

  const fromIdentities = (user.identities ?? [])
    .filter((i) => i.provider)
    .map((i) => ({
      id: i.identity_id || i.id || `${i.provider}`,
      provider: (i.provider || "email") as AuthProviderId,
      email: i.identity_data?.email ?? i.email ?? user.email ?? null,
      createdAt: i.created_at ?? null,
    }));

  if (fromIdentities.length > 0) return fromIdentities;

  // Fallback when identities array empty but app_metadata lists providers
  const metaProviders = user.app_metadata?.providers;
  if (Array.isArray(metaProviders) && metaProviders.length > 0) {
    return metaProviders.map((p) => ({
      id: String(p),
      provider: String(p),
      email: user.email,
      createdAt: null,
    }));
  }

  const single = user.app_metadata?.provider;
  if (single) {
    return [
      {
        id: single,
        provider: single,
        email: user.email,
        createdAt: null,
      },
    ];
  }

  // Password/email account with no identity payload yet
  if (user.email) {
    return [
      {
        id: "email",
        provider: "email",
        email: user.email,
        createdAt: null,
      },
    ];
  }

  return [];
}

export function hasProvider(
  identities: LinkedIdentity[],
  provider: AuthProviderId
) {
  return identities.some((i) => i.provider === provider);
}

/** Prefer social labels for UI badge (Triftly order). */
export function primaryProvider(
  identities: LinkedIdentity[]
): AuthProviderId | null {
  if (hasProvider(identities, "google")) return "google";
  if (hasProvider(identities, "apple")) return "apple";
  if (identities[0]) return identities[0].provider;
  return null;
}

export function providerLabel(provider: AuthProviderId) {
  switch (provider) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "email":
      return "Email";
    default:
      return provider;
  }
}

export function displayNameFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  email?: string | null
) {
  const pick = (k: string) => {
    const v = metadata?.[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return (
    pick("display_name") ||
    pick("full_name") ||
    pick("name") ||
    email?.split("@")[0] ||
    "Photographer"
  );
}

export function avatarFromMetadata(
  metadata: Record<string, unknown> | null | undefined
) {
  const pick = (k: string) => {
    const v = metadata?.[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return pick("avatar_url") || pick("picture");
}

/** Sorted unique provider ids from Auth user (for profiles.providers[] cache). */
export function providerIdsFromUser(
  user: AuthUserLike | null | undefined
): string[] {
  const ids = identitiesFromUser(user)
    .map((i) => String(i.provider).toLowerCase())
    .filter(Boolean);
  return [...new Set(ids)].sort();
}
