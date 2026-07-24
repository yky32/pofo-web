/** Reserved subdomains / path segments — never assign as studio slug. */
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "status",
  "static",
  "login",
  "signup",
  "dashboard",
  "settings",
  "portfolio",
  "g",
  "s",
  "auth",
  "cdn",
  "assets",
  "help",
  "support",
  "billing",
  "docs",
  "blog",
  "pofo",
  "studio",
  "client",
  "team",
  "teams",
  "workspace",
  "workspaces",
  "org",
  "orgs",
]);

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$/;

export function slugify(input: string): string {
  let v = input.toLowerCase().trim();
  v = v.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (v.length > 32) v = v.slice(0, 32).replace(/-+$/g, "");
  return v;
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 32) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return SLUG_RE.test(slug);
}

export function slugFieldError(slug: string): string | undefined {
  const s = slug.trim().toLowerCase();
  if (!s) return "Enter a studio link";
  if (s.length < 3) return "At least 3 characters";
  if (s.length > 32) return "At most 32 characters";
  if (RESERVED_SLUGS.has(s)) return "That name is reserved";
  if (!SLUG_RE.test(s)) {
    return "Use lowercase letters, numbers, and hyphens only";
  }
  return undefined;
}

/** Preferred slug from studio name or email local-part. */
export function preferredSlug(studioName?: string | null, email?: string | null) {
  const fromStudio = studioName ? slugify(studioName) : "";
  if (fromStudio.length >= 3 && !RESERVED_SLUGS.has(fromStudio)) {
    return fromStudio.slice(0, 32);
  }
  const local = email?.split("@")[0] ?? "studio";
  const fromEmail = slugify(local);
  if (fromEmail.length >= 3) return fromEmail.slice(0, 32);
  return "studio";
}
