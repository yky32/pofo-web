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
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl">
        <div className="relative min-h-[200px]">
          <PhotoImage
            src={studioPhotos.outdoor}
            alt=""
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/55 to-transparent" />
          <div className="relative flex min-h-[200px] flex-col justify-end p-6 sm:p-8">
            <p className="text-xs font-medium tracking-wide text-white/70">
              Your atelier
            </p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-medium text-white sm:text-4xl">
                  Soft light today.
                </h1>
                <p className="mt-1 text-sm text-white/70">
                  {galleries.length} galleries · {totalPhotos} photos ·{" "}
                  {proofing} proofing
                </p>
              </div>
              <Button
                className="w-fit rounded-full bg-white text-primary hover:bg-white/90"
                asChild
              >
                <Link href="/dashboard/galleries/new">
                  <Plus className="mr-1 h-4 w-4" />
                  New gallery
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Galleries", value: galleries.length },
          { label: "Proofing", value: proofing },
          { label: "Photos", value: totalPhotos },
        ].map((stat) => (
          <div key={stat.label} className="panel px-4 py-5 sm:px-6">
            <p className="label-soft">{stat.label}</p>
            <p className="mt-1 font-heading text-3xl font-medium sm:text-4xl">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl font-medium">Recent</h2>
            <p className="text-sm text-muted-foreground">
              Latest client deliveries
            </p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full" asChild>
            <Link href="/dashboard/galleries">View all</Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
