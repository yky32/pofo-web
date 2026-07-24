"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  computeUsage,
  parsePlanId,
  type BillingInterval,
  type PlanId,
  type PlanUsage,
} from "@/lib/plans";

export type BillingActionState = {
  error?: string;
  success?: string;
};

export async function getMyPlanUsage(): Promise<PlanUsage | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const plan = parsePlanId(profile?.plan as string | undefined);

  // Active = not archived (personal projects owned by user)
  const { count: activeCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .neq("status", "archived");

  // Storage: sum size_bytes of shots for this user as uploader
  const { data: sizeRows } = await supabase
    .from("shots")
    .select("size_bytes")
    .eq("owner_id", user.id);

  let storageUsedBytes = 0;
  for (const row of sizeRows ?? []) {
    storageUsedBytes += Number(row.size_bytes) || 0;
  }

  return computeUsage({
    plan,
    storageUsedBytes,
    activeProjects: activeCount ?? 0,
  });
}

/**
 * Stub upgrade — sets plan on profile. No Stripe yet.
 * Logged-in only; Free → Solo/Pro for demo / waitlist flow.
 */
export async function setPlanStub(input: {
  plan: PlanId;
  interval?: BillingInterval;
}): Promise<BillingActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const plan = parsePlanId(input.plan);
  const interval: BillingInterval =
    input.interval === "annual" ? "annual" : "monthly";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to upgrade." };

  const patch: Record<string, string> = { plan };
  // billing_interval column may not exist pre-migration
  patch.billing_interval = interval;

  let { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error && error.message.includes("billing_interval")) {
    const retry = await supabase
      .from("profiles")
      .update({ plan })
      .eq("id", user.id);
    error = retry.error;
  }

  if (error) {
    if (error.message.includes("plan") || error.code === "42703") {
      return {
        error:
          "Plan columns missing. Run supabase/features-plans.sql in the SQL Editor.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/billing");
  return {
    success:
      plan === "free"
        ? "Plan set to Free."
        : `Upgraded to ${plan === "solo" ? "Solo" : "Pro"} (billing stub — no charge yet).`,
  };
}

/** Pre-check before creating a project */
export async function canCreateProject(): Promise<{
  ok: boolean;
  reason?: "projects_limit";
  usage?: PlanUsage;
}> {
  const usage = await getMyPlanUsage();
  if (!usage) return { ok: true };
  if (usage.projectsBlocked) {
    return { ok: false, reason: "projects_limit", usage };
  }
  return { ok: true, usage };
}

/** Pre-check before registering uploaded bytes */
export async function canUploadBytes(additionalBytes: number): Promise<{
  ok: boolean;
  reason?: "storage_limit";
  usage?: PlanUsage;
}> {
  const usage = await getMyPlanUsage();
  if (!usage) return { ok: true };
  if (usage.storageUsedBytes + additionalBytes > usage.storageLimitBytes) {
    return { ok: false, reason: "storage_limit", usage };
  }
  return { ok: true, usage };
}
