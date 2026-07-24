import Link from "next/link";
import { getMyPlanUsage, setPlanStub } from "@/actions/billing";
import { PricingWall } from "@/components/billing/pricing-wall";
import { PlanUsageCard } from "@/components/billing/plan-usage-card";
import { Button } from "@/components/ui/button";
import { parsePlanId, type BillingInterval, type PlanId } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/env";

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    interval?: string;
    upgraded?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const configured = isSupabaseConfigured();
  const usage = configured ? await getMyPlanUsage() : null;
  const highlight = parsePlanId(sp.plan);
  const interval: BillingInterval =
    sp.interval === "annual" ? "annual" : "monthly";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          Account
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900">
          Plan & billing
        </h1>
        <p className="mt-1 max-w-lg text-stone-500">
          You pay for space to deliver jobs — not a studio OS. Billing is
          stubbed (no charge yet).
        </p>
        <p className="mt-2">
          <Link
            href="/dashboard/settings"
            className="text-xs text-stone-500 underline-offset-2 hover:underline"
          >
            ← Settings
          </Link>
        </p>
      </div>

      {sp.upgraded === "1" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Plan updated. Enjoy the extra room.
        </p>
      ) : null}
      {sp.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {sp.error}
        </p>
      ) : null}

      {usage ? <PlanUsageCard usage={usage} /> : null}

      {usage &&
      (highlight === "solo" || highlight === "pro") &&
      highlight !== usage.plan ? (
        <form
          action={confirmUpgrade.bind(null, highlight, interval)}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-900/10 bg-stone-900 px-4 py-3.5 text-stone-50"
        >
          <p className="text-sm">
            Switch to{" "}
            <strong className="font-semibold capitalize">{highlight}</strong>
            {interval === "annual" ? " (annual)" : " (monthly)"}?
            <span className="ml-1 text-stone-400">No charge in this build.</span>
          </p>
          <Button
            type="submit"
            size="sm"
            className="rounded-full bg-white text-stone-900 hover:bg-stone-100"
          >
            Confirm upgrade
          </Button>
        </form>
      ) : null}

      <PricingWall
        loggedIn
        currentPlan={usage?.plan ?? "free"}
        className="border-t border-stone-100 pt-10"
      />
    </div>
  );
}

async function confirmUpgrade(plan: PlanId, interval: BillingInterval) {
  "use server";
  const res = await setPlanStub({ plan, interval });
  const { redirect } = await import("next/navigation");
  if (res.error) {
    redirect(
      `/dashboard/settings/billing?plan=${plan}&error=${encodeURIComponent(res.error)}`
    );
  }
  redirect("/dashboard/settings/billing?upgraded=1");
}
