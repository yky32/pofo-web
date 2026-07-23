import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V5 — contact-sheet strip with frame numbers */
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
        "grid grid-cols-4 gap-1.5 rounded-lg border border-border bg-card p-2 sm:gap-2 sm:p-3",
        className
      )}
    >
      {photos.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className="photo-edge relative aspect-[3/2]"
        >
          <PhotoImage src={src} alt="" sizes="20vw" />
          <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 font-mono text-[9px] text-white">
            {String(i + 1).padStart(2, "0")}
          </span>
        </div>
      ))}
    </div>
  );
}
