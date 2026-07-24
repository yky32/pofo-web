/**
 * Signup workspace intent — survives Google/Apple OAuth round-trip.
 * Email signup also sets this so post-confirm login can finish team setup.
 */

export const SIGNUP_INTENT_COOKIE = "pofo_signup_intent";

export type SignupIntent = "personal" | "team";

export function parseSignupIntent(
  raw: string | null | undefined
): SignupIntent {
  return raw === "team" ? "team" : "personal";
}

/** Client-side: persist intent before OAuth redirect */
export function setSignupIntentClient(intent: SignupIntent) {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNUP_INTENT_COOKIE}=${intent}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

export function clearSignupIntentClient() {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNUP_INTENT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
