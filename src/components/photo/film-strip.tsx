import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V4 — soft rounded strip */
export function FilmStrip({
  photos,
  className,
}: {
  photos: string[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4", className)}>
      {photos.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className="photo-edge relative aspect-[4/3] shadow-sm ring-1 ring-black/5"
        >
          <PhotoImage src={src} alt="" sizes="25vw" />
        </div>
      ))}
    </div>
  );
}
