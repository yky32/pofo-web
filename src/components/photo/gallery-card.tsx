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

  const proofSuffix =
    gallery.status === "proofing" &&
    gallery.selection_limit != null
      ? `${gallery.selection_count ?? 0}/${gallery.selection_limit}`
      : null;

  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-[5px] bg-white/65 shadow-[0_8px_28px_-14px_rgba(28,25,23,0.12)] ring-1 ring-white/80 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-[0_16px_36px_-14px_rgba(28,25,23,0.16)]",
        className
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-stone-100">
        <PhotoImage
          src={cover}
          alt={gallery.title}
          sizes="(max-width:768px) 100vw, 33vw"
          className="transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-black/10" />

        {/* Status (+ proof count when proofing) — top right */}
        <div className="absolute right-2.5 top-2.5 z-10">
          <GalleryStatusBadge
            status={gallery.status}
            suffix={proofSuffix}
          />
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-heading text-lg leading-tight text-white drop-shadow">
            {gallery.title}
          </p>
          <p className="mt-0.5 text-xs text-white/75">
            {gallery.client_name} · {gallery.photo_count ?? 0} photos
          </p>
        </div>
      </div>
      {gallery.description ? (
        <div className="px-3 py-2.5 text-xs text-stone-500">
          {gallery.description}
        </div>
      ) : null}
    </Link>
  );
}
