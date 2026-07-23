import { getMyProfile } from "@/actions/profile";
import { getLinkedIdentities } from "@/actions/session";
import { ProfileForm } from "@/components/settings/profile-form";
import { LinkedProvidersCard } from "@/components/settings/linked-providers";
import { getAppUrl, getRootDomain, isSupabaseConfigured } from "@/lib/env";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const configured = isSupabaseConfigured();
  const profile = configured ? await getMyProfile() : null;
  const identities = configured ? await getLinkedIdentities() : [];

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          Account
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900">
          Settings
        </h1>
        <p className="mt-1 text-stone-500">
          Studio profile, public link, and sign-in methods.
        </p>
      </div>

      {sp.error ? (
        <p className="rounded-[5px] bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {sp.error}
        </p>
      ) : null}

      {profile ? (
        <>
          <ProfileForm
            profile={profile}
            appUrl={getAppUrl()}
            rootDomain={getRootDomain()}
          />
          <LinkedProvidersCard
            identities={identities}
            justLinked={sp.linked === "1"}
          />
        </>
      ) : (
        <div className="paper rounded-[5px] p-6 text-sm text-stone-500">
          Connect Supabase and sign in to edit your studio profile.
        </div>
      )}
    </div>
  );
}
