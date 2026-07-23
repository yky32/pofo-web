import { cn } from "@/lib/utils";
import { PhotoImage } from "@/components/photo/photo-image";

/** V1.1 — glass-edged mat around HD photo */
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
          "overflow-hidden rounded-2xl p-1.5 shadow-[0_20px_50px_-18px_rgba(28,25,23,0.35)]",
          "glass"
        )}
      >
        <div
          className={cn(
            "photo-stage relative overflow-hidden rounded-xl bg-stone-100",
            aspect
          )}
        >
          <PhotoImage
            src={src}
            alt={alt}
            priority={priority}
            sizes={sizes}
            className="transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        </div>
      </div>
      {caption ? (
        <figcaption className="px-1 pt-3 font-heading text-sm text-stone-600">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
