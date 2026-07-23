/**
 * Deterministic “random” mosaic sizing for photo grids.
 * Same id always gets the same shape so layout doesn’t jump on re-render.
 */

export type MosaicShape = "square" | "wide" | "tall" | "hero";

export type MosaicCell = {
  shape: MosaicShape;
  /** CSS grid column span */
  colSpan: 1 | 2;
  /** CSS grid row span */
  rowSpan: 1 | 2;
  /** Tailwind aspect class for the tile body */
  aspectClass: string;
};

/** FNV-1a style mix — stable per string */
export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Pick a shape from a weighted table, using hash + index so neighbours
 * vary (pure hash alone can clump similar ids).
 */
function shapeFromHash(h: number, index: number): MosaicShape {
  // Mix index so consecutive photos diversify
  const r = (h ^ Math.imul(index + 1, 0x9e3779b9)) % 100;

  // Weight toward squares; sprinkle wide/tall; rare heroes
  // Avoid hero too often: only when r is high and index spacing-ish
  if (r < 48) return "square";
  if (r < 68) return "wide";
  if (r < 88) return "tall";
  // hero ~12%, but throttle every other hero candidate
  if (index % 3 === 0) return "hero";
  return r % 2 === 0 ? "wide" : "tall";
}

export function mosaicCellFor(id: string, index: number): MosaicCell {
  const h = hashId(id);
  let shape = shapeFromHash(h, index);

  // Soft anti-clump: if previous pattern would stack heroes, demote
  // (caller can pass lastShape via optional refinement — keep pure here)

  switch (shape) {
    case "wide":
      return {
        shape,
        colSpan: 2,
        rowSpan: 1,
        aspectClass: "aspect-[3/2]",
      };
    case "tall":
      return {
        shape,
        colSpan: 1,
        rowSpan: 2,
        aspectClass: "aspect-[3/4]",
      };
    case "hero":
      return {
        shape,
        colSpan: 2,
        rowSpan: 2,
        aspectClass: "aspect-square",
      };
    default:
      return {
        shape: "square",
        colSpan: 1,
        rowSpan: 1,
        aspectClass: "aspect-square",
      };
  }
}

/**
 * Build layout for a list, with light post-pass to avoid two heroes
 * adjacent and reduce boring runs of identical shapes.
 */
export function buildMosaicLayout(
  items: { id: string }[]
): Map<string, MosaicCell> {
  const map = new Map<string, MosaicCell>();
  let prev: MosaicShape | null = null;
  let run = 0;

  items.forEach((item, index) => {
    let cell = mosaicCellFor(item.id, index);

    if (prev === cell.shape) {
      run += 1;
      if (run >= 2 && cell.shape !== "square") {
        // Break streak → force square
        cell = mosaicCellFor(item.id + ":break", index + 17);
        if (cell.shape === prev) {
          cell = {
            shape: "square",
            colSpan: 1,
            rowSpan: 1,
            aspectClass: "aspect-square",
          };
        }
      }
    } else {
      run = 0;
    }

    // Don't place two heroes back-to-back
    if (prev === "hero" && cell.shape === "hero") {
      cell = {
        shape: "wide",
        colSpan: 2,
        rowSpan: 1,
        aspectClass: "aspect-[3/2]",
      };
    }

    map.set(item.id, cell);
    prev = cell.shape;
  });

  return map;
}

/** Tailwind-safe span classes (static strings for JIT). */
export function mosaicSpanClass(cell: MosaicCell): string {
  const col =
    cell.colSpan === 2 ? "col-span-2" : "col-span-1";
  const row =
    cell.rowSpan === 2 ? "row-span-2" : "row-span-1";
  return `${col} ${row}`;
}
