/**
 * Project tags — free-form labels for filter and job nature.
 * Keep short, human-readable; normalize for storage.
 */

/** System starters (shared). User customs live on profiles.custom_project_tags. */
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

const SYSTEM_TAG_KEYS = new Set(
  SUGGESTED_PROJECT_TAGS.map((t) => t.toLowerCase())
);

export function isSystemProjectTag(tag: string): boolean {
  return SYSTEM_TAG_KEYS.has(tag.trim().toLowerCase());
}

const MAX_TAG_LEN = 24;
const MAX_TAGS = 12;
const MAX_USER_CUSTOM = 40;

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

/**
 * Merge system starters + user customs + tags already on projects.
 * System first (stable order), then user customs A–Z.
 */
export function mergeTagSuggestions(input: {
  userCustom?: string[] | null;
  fromProjects?: string[] | null;
}): string[] {
  const out: string[] = [...SUGGESTED_PROJECT_TAGS];
  const seen = new Set(out.map((t) => t.toLowerCase()));

  const extras = [
    ...parseProjectTags(input.userCustom ?? []),
    ...parseProjectTags(input.fromProjects ?? []),
  ];

  for (const t of extras) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    if (isSystemProjectTag(t)) continue;
    seen.add(key);
    out.push(t);
  }

  // Keep system block first; sort only the custom tail
  const system = out.slice(0, SUGGESTED_PROJECT_TAGS.length);
  const custom = out
    .slice(SUGGESTED_PROJECT_TAGS.length)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return [...system, ...custom].slice(
    0,
    SUGGESTED_PROJECT_TAGS.length + MAX_USER_CUSTOM
  );
}

/** Tags from a list that are not system starters (to persist for the user). */
export function customTagsOnly(tags: string[]): string[] {
  return parseProjectTags(tags).filter((t) => !isSystemProjectTag(t));
}
