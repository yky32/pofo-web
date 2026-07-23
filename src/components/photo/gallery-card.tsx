import Link from "next/link";
import { GalleryStatusBadge } from "@/components/gallery-status-badge";
import { PhotoImage } from "@/components/photo/photo-image";
import type { Gallery } from "@/types/database";
import { galleryCovers, studioPhotos } from "@/lib/photos";
import { cn } from "@/lib/utils";

export function GalleryCard({
  gallery,
  href,
  className,
}: {
  gallery: Gallery;
  href: string;
  className?: string;
}) {
  const cover = galleryCovers[gallery.id] ?? studioPhotos.studio;

  return (
    <Link
      href={href}
      className={cn(
        "panel group block overflow-hidden transition hover:border-steel/40 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <PhotoImage
          src={cover}
          alt={gallery.title}
          sizes="(max-width:768px) 100vw, 33vw"
          className="transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-snug tracking-tight group-hover:text-steel">
            {gallery.title}
          </p>
          <GalleryStatusBadge status={gallery.status} />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{gallery.client_name}</span>
          <span className="font-mono text-xs">
            {gallery.photo_count ?? 0} f
          </span>
        </div>
        {gallery.status === "proofing" ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-steel"
              style={{
                width: `${Math.min(
                  100,
                  ((gallery.selection_count ?? 0) /
                    (gallery.selection_limit || 1)) *
                    100
                )}%`,
              }}
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
