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

/** Public studio base URL when root domain is configured. */
export function studioPublicBaseUrl(slug: string, appUrl?: string) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN; // e.g. pofo.app
  if (root) {
    return `https://${slug}.${root}`;
  }
  // Dev fallback: path-style until DNS exists
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002").replace(
    /\/$/,
    ""
  );
  return `${base}/s/${slug}`;
}
