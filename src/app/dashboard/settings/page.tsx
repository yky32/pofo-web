import { getMyProfile } from "@/actions/profile";
import { ProfileForm } from "@/components/settings/profile-form";
import { getAppUrl, getRootDomain, isSupabaseConfigured } from "@/lib/env";

export default async function SettingsPage() {
  const profile = isSupabaseConfigured() ? await getMyProfile() : null;

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
          Studio profile and public link ({`{slug}.pofo.app`} when domain is
          live).
        </p>
      </div>

      {profile ? (
        <ProfileForm
          profile={profile}
          appUrl={getAppUrl()}
          rootDomain={getRootDomain()}
        />
      ) : (
        <div className="paper rounded-[5px] p-6 text-sm text-stone-500">
          Connect Supabase and sign in to edit your studio profile.
        </div>
      )}
    </div>
  );
}
