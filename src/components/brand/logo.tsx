import { cn } from "@/lib/utils";

/** Minimal aperture mark + wordmark */
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
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className={cn("h-8 w-8", markClassName)}
      >
        <circle
          cx="16"
          cy="16"
          r="14.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="16"
          cy="16"
          r="5.5"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        {/* Aperture blades */}
        <path
          d="M16 2.5 L19.2 11.2 L28.5 10.2"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M28.5 10.2 L22.8 16.8 L28.5 21.8"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M28.5 21.8 L19.2 20.8 L16 29.5"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M16 29.5 L12.8 20.8 L3.5 21.8"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M3.5 21.8 L9.2 15.2 L3.5 10.2"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M3.5 10.2 L12.8 11.2 L16 2.5"
          stroke="currentColor"
          strokeWidth="1.1"
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
