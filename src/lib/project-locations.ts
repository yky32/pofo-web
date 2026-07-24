/**
 * Project locations — multi place labels (venue, city, church…).
 * Stored in projects.location as " · "-joined text (Memories-friendly).
 */

/** Optional starters — free type always allowed */
export const SUGGESTED_LOCATIONS = [
  "Church",
  "Hotel",
  "Studio",
  "Beach",
  "Garden",
  "Restaurant",
  "Home",
  "Outdoor",
] as const;

const MAX_LOC_LEN = 48;
const MAX_LOCS = 12;

export function normalizeLocation(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.length > MAX_LOC_LEN) return t.slice(0, MAX_LOC_LEN).trim();
  return t;
}

/**
 * Parse multi-location string. Accepts:
 * - " · " / "·" (display format)
 * - commas, semicolons, pipes, newlines
 */
export function parseLocations(
  raw: string | string[] | null | undefined
): string[] {
  const parts: string[] = [];
  if (Array.isArray(raw)) {
    for (const r of raw) {
      parts.push(...String(r).split(/\s*[·|,;]\s*|\n+/));
    }
  } else if (typeof raw === "string" && raw.trim()) {
    parts.push(...raw.split(/\s*[·|,;]\s*|\n+/));
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const n = normalizeLocation(p);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= MAX_LOCS) break;
  }
  return out;
}

/** Canonical storage / display join */
export function formatLocations(locs: string[]): string {
  return parseLocations(locs).join(" · ");
}
