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
        "group block space-y-3 transition hover:-translate-y-0.5",
        className
      )}
    >
      <div className="photo-edge relative aspect-[4/3] shadow-[0_12px_32px_-16px_rgba(40,30,20,0.25)] ring-1 ring-black/[0.04]">
        <PhotoImage
          src={cover}
          alt={gallery.title}
          sizes="(max-width:768px) 100vw, 33vw"
          className="transition duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <p className="font-heading text-lg font-medium tracking-tight text-foreground group-hover:underline group-hover:underline-offset-4">
            {gallery.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {gallery.client_name}
            <span className="text-border"> · </span>
            {gallery.photo_count ?? 0} photos
          </p>
          {gallery.status === "proofing" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {gallery.selection_count}/{gallery.selection_limit} selected
            </p>
          ) : null}
        </div>
        <GalleryStatusBadge status={gallery.status} />
      </div>
    </Link>
  );
}
