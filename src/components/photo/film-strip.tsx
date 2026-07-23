import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V6 — quiet strip: V3 grid air + soft frames */
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
          className="photo-edge relative aspect-[4/3] shadow-[0_8px_24px_-12px_rgba(40,30,20,0.2)] ring-1 ring-black/[0.04]"
        >
          <PhotoImage src={src} alt="" sizes="25vw" />
        </div>
      ))}
    </div>
  );
}
