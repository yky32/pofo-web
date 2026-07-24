/**
 * Two optional addresses for a project (venue A + venue B).
 * Stored in projects.location as "Address 1 · Address 2".
 */

/** Split stored location into up to two address lines. */
export function splitTwoLocations(
  location: string | null | undefined
): [string, string] {
  if (!location?.trim()) return ["", ""];
  const raw = location.trim();

  // Prefer middle-dot join used in product copy
  if (raw.includes("·")) {
    const parts = raw
      .split(/\s*·\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return ["", ""];
    if (parts.length === 1) return [parts[0]!, ""];
    return [parts[0]!, parts.slice(1).join(" · ")];
  }

  // Legacy: first comma as split (optional)
  const comma = raw.indexOf(",");
  if (comma > 0 && comma < raw.length - 1) {
    return [raw.slice(0, comma).trim(), raw.slice(comma + 1).trim()];
  }

  return [raw, ""];
}

/** Join two address fields for DB storage. */
export function joinTwoLocations(a: string, b: string): string {
  const x = a.trim();
  const y = b.trim();
  if (x && y) return `${x} · ${y}`;
  return x || y || "";
}
