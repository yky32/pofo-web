import { cn } from "@/lib/utils";

/** V4 — soft aperture in rounded square */
export function Logo({
  className,
  markClassName,
  showWord = true,
}: {
  className?: string;
  markClassName?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground",
          markClassName
        )}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </span>
      {showWord ? (
        <span className="font-heading text-xl font-medium tracking-tight">
          Pofo
        </span>
      ) : null}
    </span>
  );
}
