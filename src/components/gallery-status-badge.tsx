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
    className: "bg-stone-600/95 text-white shadow-sm ring-1 ring-white/15",
  },
  shared: {
    label: "Shared",
    className: "bg-sky-600/95 text-white shadow-sm ring-1 ring-sky-400/30",
  },
  proofing: {
    label: "Proofing",
    className: "bg-amber-500/95 text-amber-950 shadow-sm ring-1 ring-amber-300/40",
  },
  final: {
    label: "Final",
    className: "bg-emerald-600/95 text-white shadow-sm ring-1 ring-emerald-400/30",
  },
  archived: {
    label: "Archived",
    className: "bg-stone-400/95 text-white shadow-sm ring-1 ring-white/10",
  },
};

export function GalleryStatusBadge({
  status,
  className,
}: {
  status: GalleryStatus;
  className?: string;
}) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
