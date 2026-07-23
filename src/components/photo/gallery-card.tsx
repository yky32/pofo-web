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
        "group block overflow-hidden rounded-2xl transition duration-500 hover:-translate-y-1",
        "glass shadow-[0_16px_40px_-16px_rgba(28,25,23,0.25)]",
        className
      )}
    >
      <div className="photo-stage relative aspect-[5/4] overflow-hidden">
        <PhotoImage
          src={cover}
          alt={gallery.title}
          sizes="(max-width:768px) 100vw, 33vw"
          className="transition duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-stone-950/60 via-stone-950/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-[2] p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="font-heading text-lg leading-tight text-white drop-shadow-md">
                {gallery.title}
              </p>
              <p className="mt-0.5 text-xs text-white/80">
                {gallery.client_name} · {gallery.photo_count ?? 0} photos
              </p>
            </div>
            <GalleryStatusBadge
              status={gallery.status}
              className="glass-soft border-0 text-stone-800"
            />
          </div>
        </div>
      </div>
      {gallery.status === "proofing" ? (
        <div className="flex items-center justify-between px-4 py-3 text-xs text-stone-500">
          <span>Client selecting</span>
          <span className="font-medium text-stone-800">
            {gallery.selection_count}/{gallery.selection_limit}
          </span>
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-stone-500">
          {gallery.description}
        </div>
      )}
    </Link>
  );
}
