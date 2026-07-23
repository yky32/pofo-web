import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V5 — clean lab frame with meta caption */
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
      <div className={cn("photo-edge ring-1 ring-border", aspect)}>
        <PhotoImage
          src={src}
          alt={alt}
          priority={priority}
          sizes={sizes}
          className="transition duration-500 ease-out group-hover:scale-[1.02]"
        />
      </div>
      {caption ? (
        <figcaption className="mt-2 flex items-center justify-between px-0.5">
          <span className="label-lab">{caption}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-steel" />
        </figcaption>
      ) : null}
    </figure>
  );
}
