import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "@/components/photo/gallery-card";
import { mockGalleries } from "@/lib/mock-data";

export default function GalleriesPage() {
  const galleries = mockGalleries;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-lab text-steel">Library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Galleries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jobs ready for client delivery.
          </p>
        </div>
        <Button className="w-fit bg-steel hover:bg-steel/90" asChild>
          <Link href="/dashboard/galleries/new">
            <Plus className="mr-1 h-4 w-4" />
            New gallery
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
