import { Badge } from "@/components/ui/badge";
import type { GalleryStatus } from "@/types/database";
import { cn } from "@/lib/utils";

/**
 * Distinct status colors — solid enough to read on photo covers.
 */
const statusConfig: Record<
  GalleryStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-0 bg-stone-600/95 text-white shadow-none ring-0",
  },
  shared: {
    label: "Shared",
    className: "border-0 bg-sky-600/95 text-white shadow-none ring-0",
  },
  proofing: {
    label: "Proofing",
    className: "border-0 bg-amber-500/95 text-amber-950 shadow-none ring-0",
  },
  final: {
    label: "Final",
    className: "border-0 bg-emerald-600/95 text-white shadow-none ring-0",
  },
  archived: {
    label: "Archived",
    className: "border-0 bg-stone-400/95 text-white shadow-none ring-0",
  },
};

export function GalleryStatusBadge({
  status,
  className,
  /** e.g. "4/40" for proofing progress — shown after the label */
  suffix,
}: {
  status: GalleryStatus;
  className?: string;
  suffix?: string | null;
}) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-none ring-0 outline-none",
        config.className,
        className
      )}
    >
      {config.label}
      {suffix ? (
        <span className="ml-1.5 font-semibold tabular-nums opacity-90">
          {suffix}
        </span>
      ) : null}
    </Badge>
  );
}
