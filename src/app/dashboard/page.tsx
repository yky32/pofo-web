import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "@/components/photo/gallery-card";
import { PhotoImage } from "@/components/photo/photo-image";
import { mockGalleries } from "@/lib/mock-data";
import { studioPhotos } from "@/lib/photos";

export default function DashboardPage() {
  const galleries = mockGalleries;
  const proofing = galleries.filter((g) => g.status === "proofing").length;
  const totalPhotos = galleries.reduce(
    (sum, g) => sum + (g.photo_count ?? 0),
    0
  );

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-quiet">Studio</p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight">
            Overview
          </h1>
          <p className="mt-2 text-muted-foreground">
            {galleries.length} galleries · {totalPhotos} photos · {proofing}{" "}
            proofing
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
      </section>

      <section className="photo-edge relative aspect-[21/7] min-h-[160px]">
        <PhotoImage
          src={studioPhotos.outdoor}
          alt=""
          sizes="100vw"
          className="object-cover"
        />
      </section>

      <section className="grid grid-cols-3 gap-8 border-y border-border/70 py-8">
        {[
          { label: "Galleries", value: galleries.length },
          { label: "Proofing", value: proofing },
          { label: "Photos", value: totalPhotos },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="label-quiet">{stat.label}</p>
            <p className="mt-2 font-heading text-4xl tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-heading text-2xl tracking-tight">Recent</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/galleries">View all</Link>
          </Button>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
          {galleries.slice(0, 3).map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              href={`/dashboard/galleries/${gallery.id}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
