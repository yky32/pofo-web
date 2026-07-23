import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** Soft print / mat frame around a photo */
export function PhotoFrame({
  src,
  alt,
  caption,
  className,
  aspect = "aspect-[4/5]",
  priority,
  sizes,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  aspect?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <figure
      className={cn(
        "group overflow-hidden rounded-sm bg-white p-2 shadow-[0_12px_40px_-12px_rgba(28,25,23,0.28)] ring-1 ring-stone-900/5",
        className
      )}
    >
      <div className={cn("relative overflow-hidden bg-stone-100", aspect)}>
        <PhotoImage
          src={src}
          alt={alt}
          priority={priority}
          sizes={sizes}
          className="transition duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
      {caption ? (
        <figcaption className="px-1 pt-2.5 pb-1 font-heading text-sm text-stone-600">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
