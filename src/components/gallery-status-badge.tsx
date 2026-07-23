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
    className: "bg-amber-50 text-amber-900",
  },
  final: {
    label: "Final",
    className: "bg-emerald-50 text-emerald-900",
  },
  archived: {
    label: "Archived",
    className: "bg-stone-100 text-stone-500",
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
      className={cn("border-0 font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
