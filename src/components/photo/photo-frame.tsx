import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V6 — light paper edge (V1 warmth) with air (V3), soft radius */
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
      <div className="overflow-hidden rounded-lg bg-card p-1.5 shadow-[0_12px_36px_-16px_rgba(40,30,20,0.22)] ring-1 ring-black/[0.04]">
        <div className={cn("relative overflow-hidden rounded-md bg-muted", aspect)}>
          <PhotoImage
            src={src}
            alt={alt}
            priority={priority}
            sizes={sizes}
            className="transition duration-700 ease-out group-hover:scale-[1.02]"
          />
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-2.5 px-0.5 font-heading text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
