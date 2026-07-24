/**
 * Project tags — free-form labels for filter and job nature.
 * Keep short, human-readable; normalize for storage.
 */

/** Suggested starters (photographers can still type anything). */
export const SUGGESTED_PROJECT_TAGS = [
  "Wedding",
  "Pre-wedding",
  "Engagement",
  "Commercial",
  "Portrait",
  "Family",
  "Event",
  "Studio",
] as const;

const MAX_TAG_LEN = 24;
const MAX_TAGS = 12;

/** Normalize a single tag string. */
export function normalizeTag(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.length > MAX_TAG_LEN) return t.slice(0, MAX_TAG_LEN).trim();
  return t;
}

/**
 * Parse tags from form field (comma / newline / semicolon separated)
 * or from a string[].
 */
export function parseProjectTags(
  raw: string | string[] | null | undefined
): string[] {
  const parts: string[] = [];
  if (Array.isArray(raw)) {
    for (const r of raw) parts.push(...String(r).split(/[,;\n]+/));
  } else if (typeof raw === "string" && raw.trim()) {
    parts.push(...raw.split(/[,;\n]+/));
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const n = normalizeTag(p);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function tagsOverlap(
  tags: string[] | null | undefined,
  filter: string
): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  return (tags ?? []).some((t) => t.toLowerCase() === f);
}

export function collectUniqueTags(
  projects: { tags?: string[] | null }[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of projects) {
    for (const t of p.tags ?? []) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
