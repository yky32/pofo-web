import Link from "next/link";
import { GalleryStatusBadge } from "@/components/gallery-status-badge";
import { PhotoImage } from "@/components/photo/photo-image";
import type { Gallery } from "@/types/database";
import { galleryCovers, studioPhotos } from "@/lib/photos";
import { cn } from "@/lib/utils";

/** How many tag chips before “+N” overflow */
const MAX_TAG_CHIPS = 2;

export function GalleryCard({
  gallery,
  href,
  className,
  onClick,
  selected = false,
}: {
  gallery: Gallery;
  /** When omitted (select mode), card is a button via onClick */
  href?: string;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  const cover =
    gallery.cover_url ||
    galleryCovers[gallery.id] ||
    studioPhotos.studio;

  const proofSuffix =
    gallery.status === "proofing" && gallery.selection_limit != null
      ? `${gallery.selection_count ?? 0}/${gallery.selection_limit}`
      : null;

  const tags = gallery.tags?.filter(Boolean) ?? [];
  const visibleTags = tags.slice(0, MAX_TAG_CHIPS);
  const overflow = Math.max(0, tags.length - MAX_TAG_CHIPS);
  const tagsTitle = tags.join(", ");

  const body = (
    <>
      <div className="relative aspect-[5/4] overflow-hidden bg-stone-100">
        <PhotoImage
          src={cover}
          alt={gallery.title}
          sizes="(max-width:768px) 100vw, 33vw"
          className="transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-black/10" />

        {/* Status — top right */}
        <div className="absolute right-2.5 top-2.5 z-10">
          <GalleryStatusBadge status={gallery.status} suffix={proofSuffix} />
        </div>

        {/* Tags — top left; leave room for status badge */}
        {tags.length > 0 ? (
          <div
            className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-5.5rem)] flex-wrap items-center gap-1"
            title={tagsTitle}
          >
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="max-w-[7.5rem] truncate rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/95 shadow-sm backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
            {overflow > 0 ? (
              <span className="shrink-0 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/90 shadow-sm backdrop-blur-sm">
                +{overflow}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Title block — bottom */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-heading text-lg leading-tight text-white drop-shadow">
            {gallery.title}
          </p>
          <p className="mt-0.5 text-xs text-white/75">
            {[gallery.client_name, `${gallery.photo_count ?? 0} photos`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      {gallery.description ? (
        <div className="px-3 py-2.5 text-xs text-stone-500">
          {gallery.description}
        </div>
      ) : null}
    </>
  );

  const shell = cn(
    "group block overflow-hidden rounded-[5px] bg-white/65 shadow-[0_8px_28px_-14px_rgba(28,25,23,0.12)] ring-1 ring-white/80 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-[0_16px_36px_-14px_rgba(28,25,23,0.16)]",
    selected && "ring-2 ring-stone-900 ring-offset-2",
    className
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(shell, "w-full text-left")}
    >
      {body}
    </button>
  );
}
