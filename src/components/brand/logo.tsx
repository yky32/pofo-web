import { cn } from "@/lib/utils";

/** V3 icon — minimal square + aperture circle */
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
      <svg
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden
        className={cn("h-7 w-7", markClassName)}
      >
        <rect
          x="1.5"
          y="1.5"
          width="25"
          height="25"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <circle
          cx="14"
          cy="14"
          r="5"
          stroke="currentColor"
          strokeWidth="1.25"
        />
      </svg>
      {showWord ? (
        <span className="font-heading text-xl font-medium tracking-tight">
          Pofo
        </span>
      ) : null}
    </span>
  );
}
