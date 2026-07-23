import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V3 — floating image, no mat, lots of air */
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
    <figure className={cn("group", className)}>
      <div className={cn("photo-edge", aspect)}>
        <PhotoImage
          src={src}
          alt={alt}
          priority={priority}
          sizes={sizes}
          className="transition duration-700 ease-out group-hover:scale-[1.02]"
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 label-micro text-neutral-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
