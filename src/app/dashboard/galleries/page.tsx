import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectTagFilter } from "@/components/projects/project-tag-filter";
import { ProjectsLibrary } from "@/components/projects/projects-library";
import { getDashboardProjects } from "@/lib/projects";
import {
  collectUniqueTags,
  tagsOverlap,
} from "@/lib/project-tags";
import { isSupabaseConfigured } from "@/lib/env";

export default async function GalleriesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const { projects, demoMode } = await getDashboardProjects();
  const configured = isSupabaseConfigured();
  const openNew = sp.new === "1" || sp.new === "true";
  const activeTag = sp.tag?.trim() || null;

  const allTags = collectUniqueTags(projects);
  const visible = activeTag
    ? projects.filter((p) => tagsOverlap(p.tags, activeTag))
    : projects;

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
        <CreateProjectDialog
          configured={configured}
          defaultOpen={openNew}
        />
      </div>

      {allTags.length > 0 ? (
        <ProjectTagFilter tags={allTags} activeTag={activeTag} />
      ) : null}

      {projects.length === 0 ? (
        <div className="paper rounded-[5px] p-10 text-center">
          <p className="font-heading text-xl text-stone-900">No projects yet</p>
          <p className="mt-2 text-sm text-stone-500">
            Create a project for a wedding or session.
          </p>
          <div className="flex justify-center">
            <CreateProjectDialog
              configured={configured}
              triggerVariant="empty"
            />
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="paper rounded-[5px] p-10 text-center">
          <p className="font-heading text-xl text-stone-900">
            No projects with tag “{activeTag}”
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Clear the filter or add this tag on a project in Settings.
          </p>
        </div>
      ) : (
        <ProjectsLibrary projects={visible} demoMode={demoMode} />
      )}
    </div>
  );
}
