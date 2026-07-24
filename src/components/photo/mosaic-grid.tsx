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

/**
 * Dynamic photo mosaic — dense CSS grid + deterministic size algo.
 * Row tracks are fixed units so col/row spans pack reliably.
 */
export function MosaicGrid({
  items,
  className,
  gapClassName = "gap-1.5 sm:gap-2",
  density = "studio",
  renderTile,
  onItemClick,
  itemClassName,
}: {
  items: MosaicGridItem[];
  className?: string;
  gapClassName?: string;
  density?: "studio" | "client";
  renderTile?: (ctx: RenderCtx & { image: React.ReactNode }) => React.ReactNode;
  onItemClick?: (item: MosaicGridItem, index: number) => void;
  itemClassName?: (ctx: RenderCtx) => string;
}) {
  const layout = useMemo(() => buildMosaicLayout(items), [items]);

  const cols =
    density === "client"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  // Fixed row unit → row-span-2 is truly taller (not collapsed by aspect only)
  const rows =
    density === "client"
      ? "auto-rows-[minmax(9rem,1fr)] sm:auto-rows-[minmax(10rem,1fr)]"
      : "auto-rows-[minmax(7.5rem,1fr)] sm:auto-rows-[minmax(8.5rem,1fr)] lg:auto-rows-[minmax(9rem,1fr)]";

  if (!items.length) return null;

  return (
    <div
      className={cn(
        "grid w-full grid-flow-dense",
        cols,
        rows,
        gapClassName,
        className
      )}
    >
      {items.map((item, index) => {
        const cell = layout.get(item.id)!;
        const image = (
          <PhotoImage
            src={item.src}
            alt={item.alt}
            sizes={
              cell.colSpan === 2
                ? "(max-width:768px) 100vw, 40vw"
                : "(max-width:768px) 50vw, 18vw"
            }
            className="transition duration-500 group-hover:scale-[1.04]"
          />
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
