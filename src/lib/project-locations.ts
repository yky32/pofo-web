/**
 * Flexible multi-address list for a project.
 * Stored in projects.location as " · "-joined lines.
 */

const MAX_ADDRESSES = 12;
const MAX_LEN = 120;

export function normalizeAddress(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.length > MAX_LEN ? t.slice(0, MAX_LEN).trim() : t;
}

/** Split stored location into address lines (1…N). */
export function splitAddresses(
  location: string | null | undefined
): string[] {
  if (!location?.trim()) return [""];
  const raw = location.trim();

  let parts: string[];
  if (raw.includes("·")) {
    parts = raw.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
  } else if (raw.includes("\n")) {
    parts = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  } else {
    // Single free-text address
    parts = [raw];
  }

  if (!parts.length) return [""];
  return parts.slice(0, MAX_ADDRESSES);
}

/** Join non-empty address lines for DB storage. */
export function joinAddresses(lines: string[]): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const n = normalizeAddress(line);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= MAX_ADDRESSES) break;
  }
  return out.join(" · ");
}

/** @deprecated use splitAddresses / joinAddresses */
export function splitTwoLocations(
  location: string | null | undefined
): [string, string] {
  const parts = splitAddresses(location).filter(Boolean);
  if (!parts.length) return ["", ""];
  if (parts.length === 1) return [parts[0]!, ""];
  return [parts[0]!, parts.slice(1).join(" · ")];
}

/** @deprecated use joinAddresses */
export function joinTwoLocations(a: string, b: string): string {
  return joinAddresses([a, b]);
}
