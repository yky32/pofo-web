/** Signup workspace intent type (personal | team). */

export type SignupIntent = "personal" | "team";

export function parseSignupIntent(
  raw: string | null | undefined
): SignupIntent {
  return raw === "team" ? "team" : "personal";
}

/**
 * OAuth return path for each intent — carried as `next` query on
 * `/auth/callback?code=…&next=…` (no cookie).
 */
export function oauthNextForIntent(intent: SignupIntent): string {
  return intent === "team"
    ? "/dashboard/onboarding/studio"
    : "/dashboard";
}
