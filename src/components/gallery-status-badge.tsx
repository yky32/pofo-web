import { Badge } from "@/components/ui/badge";
import type { GalleryStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  GalleryStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-stone-100 text-stone-600",
  },
  shared: {
    label: "Shared",
    className: "bg-sky-50 text-sky-800",
  },
  proofing: {
    label: "Proofing",
    className: "bg-rose-50 text-[oklch(0.45_0.1_25)]",
  },
  final: {
    label: "Final",
    className: "bg-emerald-50 text-emerald-800",
  },
  archived: {
    label: "Archived",
    className: "bg-stone-50 text-stone-400",
  },
};

export function GalleryStatusBadge({
  status,
  className,
}: {
  status: GalleryStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
