import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "@/components/photo/gallery-card";
import { getDashboardProjects } from "@/lib/projects";

export default async function GalleriesPage() {
  const { projects, demoMode } = await getDashboardProjects();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
            Library
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight text-stone-900 sm:text-4xl">
            Projects
          </h1>
          <p className="mt-1 text-stone-500">
            {demoMode
              ? "Demo data until Supabase is connected."
              : "Private client jobs, ready to deliver."}
          </p>
        </div>
        <Button
          className="w-fit rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          asChild
        >
          <Link href="/dashboard/galleries/new">
            <Plus className="mr-1 h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="paper rounded-[5px] p-10 text-center">
          <p className="font-heading text-xl text-stone-900">No projects yet</p>
          <p className="mt-2 text-sm text-stone-500">
            Create a project for a wedding or session.
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
          {projects.map((project) => (
            <GalleryCard
              key={project.id}
              gallery={project}
              href={`/dashboard/galleries/${project.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
