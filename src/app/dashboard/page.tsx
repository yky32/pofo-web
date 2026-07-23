import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "@/components/photo/gallery-card";
import { PhotoImage } from "@/components/photo/photo-image";
import { getDashboardProjects } from "@/lib/projects";
import { studioPhotos } from "@/lib/photos";

export default async function DashboardPage() {
  const { projects, demoMode } = await getDashboardProjects();
  const proofing = projects.filter((g) => g.status === "proofing").length;
  const totalPhotos = projects.reduce(
    (sum, g) => sum + (g.photo_count ?? 0),
    0
  );

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[5px] film-grain">
        <div className="relative min-h-[180px] sm:min-h-[200px]">
          <PhotoImage
            src={studioPhotos.outdoor}
            alt=""
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-950/50 to-stone-950/20" />
          <div className="relative flex h-full min-h-[180px] flex-col justify-end p-6 sm:min-h-[200px] sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              Your studio
            </p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-medium text-white sm:text-4xl">
                  Good light today.
                </h1>
                <p className="mt-1 text-sm text-white/70">
                  {projects.length} projects
                  {demoMode
                    ? ` · ${totalPhotos} photos (demo)`
                    : proofing > 0
                      ? ` · ${proofing} proofing`
                      : ""}
                </p>
              </div>
              <Button
                className="w-fit rounded-full bg-white text-stone-900 hover:bg-stone-100"
                asChild
              >
                <Link href="/dashboard/galleries/new">
                  <Plus className="mr-1 h-4 w-4" />
                  New project
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Projects", value: projects.length },
          { label: "Proofing", value: proofing },
          {
            label: "Photos",
            value: demoMode ? totalPhotos : "—",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="paper rounded-[5px] px-4 py-5 sm:px-6"
          >
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
              Recent projects
            </h2>
            <p className="text-sm text-stone-500">
              {demoMode
                ? "Demo data — connect Supabase to go live"
                : "Your latest client deliveries"}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-stone-600" asChild>
            <Link href="/dashboard/galleries">View all</Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="paper rounded-[5px] p-10 text-center">
            <p className="font-heading text-xl text-stone-900">No projects yet</p>
            <p className="mt-2 text-sm text-stone-500">
              Create your first job to start delivering.
            </p>
            <Button
              className="mt-6 rounded-full bg-stone-900 text-stone-50"
              asChild
            >
              <Link href="/dashboard/galleries/new">New project</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 3).map((project) => (
              <GalleryCard
                key={project.id}
                gallery={project}
                href={`/dashboard/galleries/${project.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
