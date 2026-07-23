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
    className: "bg-primary text-primary-foreground",
  },
  proofing: {
    label: "Proofing",
    className: "bg-stone-200 text-stone-800",
  },
  final: {
    label: "Final",
    className: "border border-primary/20 bg-card text-foreground",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground",
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
        "rounded-md border-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
