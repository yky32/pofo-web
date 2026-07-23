import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V4 — soft rounded photo with gentle lift */
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
      <div
        className={cn(
          "photo-edge shadow-[0_16px_40px_-20px_rgba(80,50,40,0.35)] ring-1 ring-black/5",
          aspect
        )}
      >
        <PhotoImage
          src={src}
          alt={alt}
          priority={priority}
          sizes={sizes}
          className="transition duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 px-1 font-heading text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
