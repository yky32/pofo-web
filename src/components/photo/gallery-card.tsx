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
  const cover =
    galleryCovers[gallery.id] ?? studioPhotos.studio;

  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-sm bg-white shadow-[0_8px_30px_-12px_rgba(28,25,23,0.2)] ring-1 ring-stone-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-16px_rgba(28,25,23,0.28)]",
        className
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-stone-200">
        <PhotoImage
          src={cover}
          alt={gallery.title}
          sizes="(max-width:768px) 100vw, 33vw"
          className="transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div>
            <p className="font-heading text-lg leading-tight text-white drop-shadow">
              {gallery.title}
            </p>
            <p className="mt-0.5 text-xs text-white/75">
              {gallery.client_name} · {gallery.photo_count ?? 0} photos
            </p>
          </div>
          <GalleryStatusBadge
            status={gallery.status}
            className="bg-white/90 text-stone-800 backdrop-blur"
          />
        </div>
      </div>
      {gallery.status === "proofing" ? (
        <div className="flex items-center justify-between px-3 py-2.5 text-xs text-stone-500">
          <span>Client selecting</span>
          <span className="font-medium text-stone-800">
            {gallery.selection_count}/{gallery.selection_limit}
          </span>
        </div>
      ) : (
        <div className="px-3 py-2.5 text-xs text-stone-500">
          {gallery.description}
        </div>
      )}
    </Link>
  );
}
