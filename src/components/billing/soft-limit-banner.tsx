import Link from "next/link";
import { formatBytes, formatGb, planOf, type PlanUsage } from "@/lib/plans";

/** Soft prompt when storage or projects ≥ 80% — never on client gallery. */
export function SoftLimitBanner({ usage }: { usage: PlanUsage }) {
  if (!usage.nearLimit) return null;

  const storageWarn = usage.storageRatio >= 0.8;
  const projectsWarn = usage.projectsRatio >= 0.8;
  const def = planOf(usage.plan);
  const atTop = usage.plan === "pro";

  let message = "";
  if (storageWarn && projectsWarn) {
    message = `Storage ${formatBytes(usage.storageUsedBytes)} / ${formatGb(def.storageGb)} · Projects ${usage.activeProjects}/${usage.activeProjectsLimit}`;
  } else if (storageWarn) {
    message = atTop
      ? `Storage ${formatBytes(usage.storageUsedBytes)} / ${formatGb(def.storageGb)} — almost full`
      : `Storage ${formatBytes(usage.storageUsedBytes)} / ${formatGb(def.storageGb)} — Upgrade for more space`;
  } else {
    message = atTop
      ? `Projects ${usage.activeProjects} / ${usage.activeProjectsLimit} active — near your limit`
      : `Projects ${usage.activeProjects} / ${usage.activeProjectsLimit} active — Upgrade for more rooms`;
  }

  return (
    <div className="rounded-[8px] border border-amber-200/80 bg-amber-50/90 px-3.5 py-2.5 text-sm text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs leading-snug sm:text-sm">{message}</p>
        <Link
          href="/dashboard/settings/billing"
          className="shrink-0 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline"
        >
          {atTop ? "Manage plan" : "Upgrade"}
        </Link>
      </div>
    </div>
  );
}
