"use client";

import { useState } from "react";
import type { PortfolioItemRow } from "@/actions/portfolio";
import { PortfolioManager } from "@/components/portfolio/portfolio-manager";
import { PortfolioPageBuilder } from "@/components/portfolio/portfolio-page-builder";
import type { PortfolioPageConfig } from "@/lib/portfolio-page";
import { cn } from "@/lib/utils";

type Tab = "photos" | "design";

/**
 * Portfolio hub: photo library + limited page design builder.
 */
export function PortfolioWorkspace({
  items,
  studioSlug,
  studioName,
  appUrl,
  pageConfig,
}: {
  items: PortfolioItemRow[];
  studioSlug: string | null;
  studioName?: string | null;
  appUrl: string;
  pageConfig: PortfolioPageConfig;
}) {
  const [tab, setTab] = useState<Tab>("photos");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1 rounded-full bg-stone-100/90 p-1 w-fit">
        {(
          [
            { id: "photos" as const, label: "Photos" },
            { id: "design" as const, label: "Page design" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              tab === t.id
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photos" ? (
        <PortfolioManager
          items={items}
          studioSlug={studioSlug}
          studioName={studioName}
          appUrl={appUrl}
        />
      ) : (
        <PortfolioPageBuilder
          initial={pageConfig}
          studioName={studioName}
        />
      )}
    </div>
  );
}
