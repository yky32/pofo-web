import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** Horizontal film-strip — light glass shell (V1 UI, lighter color) */
export function FilmStrip({
  photos,
  className,
}: {
  photos: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[5px] bg-white/55 px-3 py-4 shadow-[0_8px_28px_-14px_rgba(28,25,23,0.1)] ring-1 ring-white/80 backdrop-blur-sm",
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-y-0 left-0 flex w-3 flex-col items-center justify-around py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={`l-${i}`} className="h-2 w-1.5 rounded-[1px] bg-stone-200" />
        ))}
      </div>
      <div className="absolute inset-y-0 right-0 flex w-3 flex-col items-center justify-around py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={`r-${i}`} className="h-2 w-1.5 rounded-[1px] bg-stone-200" />
        ))}
      </div>

      <div className="flex gap-2 px-2">
        {photos.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative aspect-[3/2] min-w-[28%] flex-1 overflow-hidden bg-stone-100 ring-1 ring-stone-200/80"
          >
            <PhotoImage src={src} alt="" sizes="200px" />
            <span className="absolute bottom-1 left-1 font-mono text-[9px] tracking-wider text-white/80 drop-shadow">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
