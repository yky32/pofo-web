"use client";

import { useMemo } from "react";
import { PhotoImage } from "@/components/photo/photo-image";
import {
  buildMosaicLayout,
  mosaicSpanClass,
  type MosaicCell,
} from "@/lib/mosaic-layout";
import { cn } from "@/lib/utils";

export type MosaicGridItem = {
  id: string;
  src: string;
  alt: string;
};

type RenderCtx = {
  item: MosaicGridItem;
  cell: MosaicCell;
  index: number;
};

/** Photographer / studio contact-sheet layout modes */
export type ContactViewLayout = "mosaic" | "square" | "dense" | "large";

const SQUARE_CELL: MosaicCell = {
  shape: "square",
  colSpan: 1,
  rowSpan: 1,
  aspectClass: "aspect-square",
};

/**
 * Dynamic photo mosaic — dense CSS grid + deterministic size algo.
 * Row tracks are fixed units so col/row spans pack reliably.
 */
export function MosaicGrid({
  items,
  className,
  gapClassName,
  density = "studio",
  layout: viewLayout = "mosaic",
  renderTile,
  onItemClick,
  itemClassName,
}: {
  items: MosaicGridItem[];
  className?: string;
  gapClassName?: string;
  density?: "studio" | "client";
  /** Contact sheet view mode (studio). Client density ignores this. */
  layout?: ContactViewLayout;
  renderTile?: (ctx: RenderCtx & { image: React.ReactNode }) => React.ReactNode;
  onItemClick?: (item: MosaicGridItem, index: number) => void;
  itemClassName?: (ctx: RenderCtx) => string;
}) {
  const layout = useMemo(() => {
    if (viewLayout === "mosaic") return buildMosaicLayout(items);
    const map = new Map<string, MosaicCell>();
    for (const item of items) map.set(item.id, SQUARE_CELL);
    return map;
  }, [items, viewLayout]);

  const cols =
    density === "client"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
      : viewLayout === "dense"
        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
        : viewLayout === "large"
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
          : // mosaic + square
            "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  // Fixed row unit → row-span-2 is truly taller (not collapsed by aspect only)
  const rows =
    density === "client"
      ? "auto-rows-[minmax(9rem,1fr)] sm:auto-rows-[minmax(10rem,1fr)]"
      : viewLayout === "dense"
        ? "auto-rows-[minmax(5.5rem,1fr)] sm:auto-rows-[minmax(6rem,1fr)]"
        : viewLayout === "large"
          ? "auto-rows-[minmax(12rem,1fr)] sm:auto-rows-[minmax(14rem,1fr)] lg:auto-rows-[minmax(16rem,1fr)]"
          : viewLayout === "square"
            ? "auto-rows-[minmax(8rem,1fr)] sm:auto-rows-[minmax(9rem,1fr)]"
            : "auto-rows-[minmax(7.5rem,1fr)] sm:auto-rows-[minmax(8.5rem,1fr)] lg:auto-rows-[minmax(9rem,1fr)]";

  const gap =
    gapClassName ??
    (viewLayout === "dense"
      ? "gap-1 sm:gap-1.5"
      : viewLayout === "large"
        ? "gap-2 sm:gap-3"
        : "gap-1.5 sm:gap-2");

  if (!items.length) return null;

  return (
    <div
      className={cn(
        "grid w-full grid-flow-dense",
        cols,
        rows,
        gap,
        className
      )}
    >
      {items.map((item, index) => {
        const cell = layout.get(item.id)!;
        const image = item.src ? (
          <PhotoImage
            src={item.src}
            alt={item.alt}
            sizes={
              viewLayout === "large"
                ? "(max-width:768px) 100vw, 33vw"
                : cell.colSpan === 2
                  ? "(max-width:768px) 100vw, 40vw"
                  : "(max-width:768px) 50vw, 18vw"
            }
            className="transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-stone-200/80 text-[11px] text-stone-500"
            aria-hidden
          >
            Pending
          </div>
        );

        const ctx: RenderCtx = { item, cell, index };
        const body = renderTile ? (
          renderTile({ ...ctx, image })
        ) : (
          <div className="absolute inset-0">{image}</div>
        );

        const interactive = Boolean(onItemClick);
        const classNames = cn(
          "group relative overflow-hidden rounded-[6px] bg-transparent",
          // Uniform modes force square aspect via min-height of rows + square cell
          viewLayout !== "mosaic" && "aspect-square",
          mosaicSpanClass(cell),
          interactive && "cursor-pointer text-left",
          itemClassName?.(ctx)
        );

        if (interactive) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick?.(item, index)}
              className={classNames}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={item.id} className={classNames}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
