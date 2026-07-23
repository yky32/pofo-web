import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "@/components/photo/gallery-card";
import { mockGalleries } from "@/lib/mock-data";

export default function GalleriesPage() {
  const galleries = mockGalleries;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-quiet">Library</p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight">
            Galleries
          </h1>
          <p className="mt-2 text-muted-foreground">
            Private sets for clients.
          </p>
        </div>
        <Button
          className="w-fit rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          asChild
        >
          <Link href="/dashboard/galleries/new">
            <Plus className="mr-1 h-4 w-4" />
            New gallery
          </Link>
        </Button>
      </div>

      <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
        {galleries.map((gallery) => (
          <GalleryCard
            key={gallery.id}
            gallery={gallery}
            href={`/dashboard/galleries/${gallery.id}`}
          />
        ))}
      </div>
    </div>
  );
}
