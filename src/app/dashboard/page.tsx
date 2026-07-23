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
      {/* Immersive studio banner */}
      <section className="photo-stage relative overflow-hidden rounded-3xl film-grain">
        <div className="relative min-h-[240px] sm:min-h-[300px]">
          <PhotoImage
            src={studioPhotos.outdoor}
            alt=""
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-stone-950/70 via-stone-950/35 to-transparent" />
          <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_70%_50%,transparent_20%,oklch(0.2_0.02_50_/_0.25)_100%)]" />
          <div className="relative z-[2] flex min-h-[240px] flex-col justify-end p-6 sm:min-h-[300px] sm:p-8">
            <div className="glass-dark max-w-lg rounded-2xl p-5 text-white sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                Your studio
              </p>
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="font-heading text-3xl font-medium sm:text-4xl">
                    Good light today.
                  </h1>
                  <p className="mt-1 text-sm text-white/70">
                    {galleries.length} galleries · {totalPhotos} photos ·{" "}
                    {proofing} awaiting selection
                  </p>
                </div>
                <Button
                  className="w-fit shrink-0 rounded-full bg-white/95 text-stone-900 hover:bg-white"
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
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Galleries", value: galleries.length },
          { label: "Proofing", value: proofing },
          { label: "Photos", value: totalPhotos },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl px-4 py-5 sm:px-6">
            <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
              {stat.label}
            </p>
            <p className="mt-1 font-heading text-3xl font-medium text-stone-900 sm:text-4xl">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl font-medium text-stone-900">
              Recent galleries
            </h2>
            <p className="text-sm text-stone-500">Your latest client deliveries</p>
          </div>
          <Button variant="ghost" size="sm" className="text-stone-600" asChild>
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
