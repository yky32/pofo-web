"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  formatBytes,
  formatGb,
  planOf,
  type PlanUsage,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PlanUsageCard({
  usage,
  className,
}: {
  usage: PlanUsage;
  className?: string;
}) {
  const def = planOf(usage.plan);

  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200/90 bg-white/70 p-5 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-400">
            Plan
          </p>
          <p className="mt-1 font-heading text-2xl font-medium text-stone-900">
            {def.name}
          </p>
        </div>
        {usage.plan === "free" || usage.nearLimit ? (
          <Button size="sm" className="rounded-full" asChild>
            <Link href="/dashboard/settings/billing">Upgrade</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-full" asChild>
            <Link href="/dashboard/settings/billing">Manage plan</Link>
          </Button>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <UsageBar
          label="Storage"
          used={formatBytes(usage.storageUsedBytes)}
          limit={formatGb(def.storageGb)}
          ratio={usage.storageRatio}
          warn={usage.storageRatio >= 0.8}
        />
        <UsageBar
          label="Active projects"
          used={String(usage.activeProjects)}
          limit={String(usage.activeProjectsLimit)}
          ratio={usage.projectsRatio}
          warn={usage.projectsRatio >= 0.8}
        />
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  ratio,
  warn,
}: {
  label: string;
  used: string;
  limit: string;
  ratio: number;
  warn?: boolean;
}) {
  const pct = Math.min(100, Math.round(ratio * 100));
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-stone-500">{label}</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            warn ? "text-amber-800" : "text-stone-800"
          )}
        >
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            warn ? "bg-amber-500" : "bg-stone-900"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
