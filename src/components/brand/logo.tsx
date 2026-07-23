import { cn } from "@/lib/utils";

/** V5 — precision aperture mark */
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
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={cn("h-6 w-6 text-steel", markClassName)}
      >
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
      {showWord ? (
        <span className="text-base font-semibold tracking-tight">Pofo</span>
      ) : null}
    </span>
  );
}
