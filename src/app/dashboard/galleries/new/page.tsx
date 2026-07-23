import { CreateProjectForm } from "@/components/projects/create-project-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function NewGalleryPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          Create
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900">
          New project
        </h1>
        <p className="mt-1 text-stone-500">
          One job / wedding / session. Upload comes next.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-[5px] bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/70">
          Supabase is not configured yet. Add keys from{" "}
          <code className="text-xs">supabase/SETUP.md</code> to{" "}
          <code className="text-xs">.env.local</code>, then restart the dev
          server.
        </div>
      ) : null}

      <CreateProjectForm />
    </div>
  );
}
