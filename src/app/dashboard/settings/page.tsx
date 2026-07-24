import Link from "next/link";
import { Building2, CreditCard, Sparkles } from "lucide-react";
import { getMyProfile } from "@/actions/profile";
import { getLinkedIdentities } from "@/actions/session";
import { listMyTeams } from "@/actions/teams";
import { ProfileForm } from "@/components/settings/profile-form";
import { CreateStudioForm } from "@/components/settings/create-studio-form";
import { LinkedProvidersCard } from "@/components/settings/linked-providers";
import { getAppUrl, getRootDomain, isSupabaseConfigured } from "@/lib/env";

function Island({
  title,
  description,
  children,
  className = "",
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-stone-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-medium text-stone-900 sm:text-xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-sm text-stone-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const configured = isSupabaseConfigured();
  const profile = configured ? await getMyProfile() : null;
  const identities = configured ? await getLinkedIdentities() : [];
  const teams = configured ? await listMyTeams() : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
      {/* Header + plan chip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
            Account
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900">
            Settings
          </h1>
          <p className="mt-1 max-w-md text-stone-500">
            Brand, workspaces, plan, and sign-in — keep it simple.
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 sm:self-auto"
        >
          <CreditCard className="h-3.5 w-3.5 opacity-70" strokeWidth={1.75} />
          Plan &amp; billing
        </Link>
      </div>

      {sp.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {sp.error}
        </p>
      ) : null}

      {profile ? (
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Personal brand — main column */}
          <Island
            title="Personal brand"
            description="How clients see you on /s/… and gallery footers."
            className="lg:col-span-7"
          >
            <ProfileForm
              profile={profile}
              appUrl={getAppUrl()}
              rootDomain={getRootDomain()}
              dense
            />
          </Island>

          {/* Side stack: plan + sign-in */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            <Island
              title="Plan"
              description="Storage & active projects."
              action={
                <Link
                  href="/dashboard/settings/billing"
                  className="text-xs font-semibold text-stone-900 underline-offset-2 hover:underline"
                >
                  Manage
                </Link>
              }
            >
              <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-3.5 py-3 ring-1 ring-stone-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    Your plan
                  </p>
                  <p className="text-xs text-stone-500">
                    Upgrade when you need more space to deliver.
                  </p>
                </div>
                <Link
                  href="/dashboard/settings/billing"
                  className="shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
                >
                  Upgrade
                </Link>
              </div>
            </Island>

            <Island
              title="Sign-in"
              description="Linked Google, Apple, or email."
              className="flex-1"
            >
              <LinkedProvidersCard
                identities={identities}
                justLinked={sp.linked === "1"}
                bare
              />
            </Island>
          </div>

          {/* Workspaces — full width island */}
          <Island
            title="Workspaces"
            description="One login. Personal jobs stay private; studios are for company deliveries."
            className="lg:col-span-12"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
                  Your studios
                </p>
                {teams.length > 0 ? (
                  <ul className="space-y-2">
                    {teams.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-stone-50/80 px-3 py-2.5 text-sm"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 ring-1 ring-stone-200">
                          <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-stone-900">
                            {t.name}
                          </p>
                          <p className="font-mono text-[11px] text-stone-400">
                            /s/{t.slug}
                            {t.my_role ? ` · ${t.my_role}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-3 py-4 text-sm text-stone-500">
                    No studio yet — create one when you’re ready (coming soon on
                    signup; available here later).
                  </p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
                  Create studio
                </p>
                <CreateStudioForm compact />
              </div>
            </div>
          </Island>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-6 text-sm text-stone-500">
          Connect Supabase and sign in to edit your studio profile.
        </div>
      )}
    </div>
  );
}
