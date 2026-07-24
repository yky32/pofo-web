import { RESERVED_SLUGS } from "@/lib/slug";

export type HostContext =
  | { kind: "marketing" }
  | { kind: "app" }
  | { kind: "studio"; slug: string }
  | { kind: "unknown" };

/**
 * Parse request Host into marketing / app / studio-subdomain.
 * Supports: app.pofo.app, {slug}.pofo.app, {slug}.localhost, localhost, *.vercel.app
 */
export function parseHost(hostHeader: string | null | undefined): HostContext {
  if (!hostHeader) return { kind: "unknown" };

  const host = hostHeader.toLowerCase().split(":")[0] ?? "";

  // Local: wy-studio.localhost → studio; localhost → app
  if (host === "localhost" || host === "127.0.0.1") {
    return { kind: "app" };
  }
  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    if (slug && !slug.includes(".") && !RESERVED_SLUGS.has(slug)) {
      return { kind: "studio", slug };
    }
    return { kind: "unknown" };
  }

  // Production-style
  if (host === "app.pofo.app") return { kind: "app" };
  if (host === "pofo.app" || host === "www.pofo.app") return { kind: "marketing" };

  if (host.endsWith(".pofo.app")) {
    const slug = host.slice(0, -".pofo.app".length);
    if (
      slug &&
      !slug.includes(".") &&
      !RESERVED_SLUGS.has(slug) &&
      slug !== "www" &&
      slug !== "app"
    ) {
      return { kind: "studio", slug };
    }
    return { kind: "unknown" };
  }

  // Vercel preview / production alias — treat as app host
  if (host.endsWith(".vercel.app") || host === "pofo-web.vercel.app") {
    return { kind: "app" };
  }

  return { kind: "unknown" };
}

export function studioSlugFromHeaders(headers: Headers): string | null {
  const h = headers.get("x-studio-slug");
  if (!h) return null;
  const slug = h.trim().toLowerCase();
  if (!slug || RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

/**
 * Public portfolio URL for a studio slug.
 * Prefer subdomain: `{slug}.pofo.app` or `{slug}.localhost:port`.
 * Path `/s/{slug}` is only a last-resort fallback (e.g. plain Vercel host).
 */
export function studioPublicBaseUrl(slug: string, appUrl?: string) {
  const clean = slug.trim().toLowerCase();
  if (!clean) return appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN; // e.g. pofo.app
  if (root) {
    return `https://${clean}.${root}`;
  }

  const base = (
    appUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  try {
    const u = new URL(base);
    const host = u.hostname;
    // Local: subdomain-style portfolio (middleware rewrites → /s/{slug})
    if (host === "localhost" || host === "127.0.0.1") {
      const port = u.port ? `:${u.port}` : "";
      return `${u.protocol}//${clean}.localhost${port}`;
    }
  } catch {
    /* fall through */
  }

  // Hosted without custom apex (e.g. *.vercel.app) — no real studio DNS
  return `${base}/s/${clean}`;
}

/**
 * True when we can serve public surfaces on a real studio host
 * (`{slug}.pofo.app` or `{slug}.localhost`), not path `/s/{slug}`.
 */
export function hasStudioSubdomainRouting(appUrl?: string): boolean {
  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) return true;
  const base = (
    appUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  try {
    const host = new URL(base).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Client proofing gallery URL.
 * Prefer studio host: `https://yky32is.pofo.app/g/{token}` or local `yky32is.localhost/g/{token}`.
 * Never under `/s/{slug}` — that path is portfolio only.
 * Without subdomain routing, app-host `/g/{token}` (token remains the secret).
 */
export function clientGalleryPublicUrl(
  token: string,
  studioSlug?: string | null,
  appUrl?: string
) {
  const tok = token.trim();
  const appBase = (
    appUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  if (!tok) return appBase;

  const slug = studioSlug?.trim().toLowerCase();
  if (slug && hasStudioSubdomainRouting(appUrl)) {
    // Studio host only — never `${app}/s/${slug}/g/…`
    return `${studioPublicBaseUrl(slug, appUrl).replace(/\/$/, "")}/g/${tok}`;
  }

  return `${appBase}/g/${tok}`;
}
