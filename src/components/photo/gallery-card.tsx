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
        "panel group block overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-24px_rgba(80,50,40,0.35)]",
        className
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden">
        <PhotoImage
          src={cover}
          alt={gallery.title}
          sizes="(max-width:768px) 100vw, 33vw"
          className="transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3">
          <GalleryStatusBadge
            status={gallery.status}
            className="bg-white/95 text-foreground shadow-sm backdrop-blur"
          />
        </div>
      </div>
      <div className="space-y-1 p-4">
        <p className="font-heading text-lg font-medium leading-snug tracking-tight">
          {gallery.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {gallery.client_name} · {gallery.photo_count ?? 0} photos
        </p>
        {gallery.status === "proofing" ? (
          <p className="pt-1 text-xs font-medium text-rose">
            {gallery.selection_count}/{gallery.selection_limit} selected
          </p>
        ) : (
          <p className="line-clamp-1 pt-1 text-xs text-muted-foreground">
            {gallery.description}
          </p>
        )}
      </div>
    </Link>
  );
}
