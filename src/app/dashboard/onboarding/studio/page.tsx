import { redirect } from "next/navigation";
import {
  ensureTeamFromSignupMetadata,
  listMyTeams,
} from "@/actions/teams";
import { CreateStudioForm } from "@/components/settings/create-studio-form";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * OAuth / post-signup path for team intent.
 * If metadata already created a team, skip to dashboard.
 */
export default async function StudioOnboardingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const existing = await listMyTeams();
  if (existing.length > 0) {
    redirect("/dashboard");
  }

  // Try create from signup metadata (email team intent after confirm, or OAuth meta)
  const fromMeta = await ensureTeamFromSignupMetadata();
  if (fromMeta.teamId) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          Workspace
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900">
          Create your studio
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Same login as your personal account. Company projects stay separate
          from private jobs.
        </p>
      </div>
      {fromMeta.error ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {fromMeta.error}
        </p>
      ) : null}
      <CreateStudioForm />
    </div>
  );
}
