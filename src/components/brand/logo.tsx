import { cn } from "@/lib/utils";

/** V6 — quiet aperture: V3 simplicity + soft mark */
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
        <circle
          cx="14"
          cy="14"
          r="12.5"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <circle
          cx="14"
          cy="14"
          r="4.5"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M14 2.8 L16.2 10.2 L24 9.4"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M24 9.4 L19.6 14.5 L24 18.8"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M24 18.8 L16.2 17.8 L14 25.2"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M14 25.2 L11.8 17.8 L4 18.8"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M4 18.8 L8.4 13.5 L4 9.4"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M4 9.4 L11.8 10.2 L14 2.8"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
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
