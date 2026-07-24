/**
 * Signup workspace intent (personal | team).
 * Stateless: OAuth carries intent only via callback `?next=` (see PRODUCT.md).
 */

export type SignupIntent = "personal" | "team";

export function parseSignupIntent(
  raw: string | null | undefined
): SignupIntent {
  return raw === "team" ? "team" : "personal";
}

/** OAuth return path — encoded in URL, not cookies. */
export function oauthNextForIntent(intent: SignupIntent): string {
  return intent === "team"
    ? "/dashboard/onboarding/studio"
    : "/dashboard";
}
