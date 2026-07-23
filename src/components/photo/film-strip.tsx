import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V3 — clean horizontal strip, no sprockets */
export function FilmStrip({
  photos,
  className,
}: {
  photos: string[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:gap-3", className)} aria-hidden>
      {photos.map((src, i) => (
        <div key={`${src}-${i}`} className="photo-edge relative aspect-[4/3]">
          <PhotoImage src={src} alt="" sizes="25vw" />
        </div>
      ))}
    </div>
  );
}
