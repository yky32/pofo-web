import { Badge } from "@/components/ui/badge";
import type { GalleryStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  GalleryStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-neutral-100 text-neutral-600",
  },
  shared: {
    label: "Shared",
    className: "bg-neutral-900 text-white",
  },
  proofing: {
    label: "Proofing",
    className: "bg-neutral-200 text-neutral-800",
  },
  final: {
    label: "Final",
    className: "border border-neutral-900 bg-white text-neutral-900",
  },
  archived: {
    label: "Archived",
    className: "bg-neutral-50 text-neutral-400",
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
        "rounded-none border-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
