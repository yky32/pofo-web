import { Badge } from "@/components/ui/badge";
import type { GalleryStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  GalleryStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600",
  },
  shared: {
    label: "Shared",
    className: "bg-sky-50 text-sky-800",
  },
  proofing: {
    label: "Proofing",
    className: "bg-blue-50 text-blue-800",
  },
  final: {
    label: "Final",
    className: "bg-emerald-50 text-emerald-800",
  },
  archived: {
    label: "Archived",
    className: "bg-slate-50 text-slate-400",
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
        "rounded-md border-0 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
