/**
 * Pofo pricing v1 — storage-first, Free by default.
 * No Stripe yet; plan stored on profiles.plan.
 */

export type PlanId = "free" | "solo" | "pro";
export type BillingInterval = "monthly" | "annual";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  /** USD per month when billed monthly */
  priceMonthly: number;
  /** Effective USD per month when billed annually */
  priceAnnualMonthly: number;
  storageGb: number;
  activeProjects: number;
  badge?: string;
  cta: string;
  features: string[];
  limitsNote?: string;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    storageGb: 50,
    activeProjects: 3,
    cta: "Let's Go",
    features: [
      "Private client galleries",
      "Share links (password + expiry)",
      "Client proofing",
      "Basic original download window",
      "Personal portfolio page",
    ],
    limitsNote: "Pofo branding on galleries · No team workspace",
  },
  solo: {
    id: "solo",
    name: "Solo",
    priceMonthly: 12,
    priceAnnualMonthly: 10,
    storageGb: 500,
    activeProjects: 20,
    badge: "Most popular",
    cta: "Choose Solo",
    features: [
      "Everything in Free",
      "RAW upload + RAW download",
      "Remove Pofo branding",
      "Custom studio logo / name on galleries",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    priceAnnualMonthly: 24,
    storageGb: 2000,
    activeProjects: 100,
    cta: "Choose Pro",
    features: [
      "Everything in Solo",
      "Higher capacity for multi-job studios",
      "Longer retention defaults",
      "Team workspace coming",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "solo", "pro"];

export function planOf(id: string | null | undefined): PlanDefinition {
  if (id === "solo" || id === "pro") return PLANS[id];
  return PLANS.free;
}

export function parsePlanId(raw: string | null | undefined): PlanId {
  if (raw === "solo" || raw === "pro" || raw === "free") return raw;
  return "free";
}

export function storageBytesLimit(plan: PlanId): number {
  return planOf(plan).storageGb * 1024 * 1024 * 1024;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb < 0.1) {
    const mb = bytes / (1024 * 1024);
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
}

export function formatGb(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(gb % 1000 === 0 ? 0 : 1)} TB`;
  return `${gb} GB`;
}

export function priceLabel(
  plan: PlanDefinition,
  interval: BillingInterval
): { amount: string; period: string } {
  if (plan.priceMonthly === 0) {
    return { amount: "$0", period: "forever" };
  }
  const n =
    interval === "annual" ? plan.priceAnnualMonthly : plan.priceMonthly;
  return {
    amount: `$${n}`,
    period: interval === "annual" ? "/mo, billed yearly" : "/mo",
  };
}

export type PlanUsage = {
  plan: PlanId;
  storageUsedBytes: number;
  storageLimitBytes: number;
  activeProjects: number;
  activeProjectsLimit: number;
  storageRatio: number;
  projectsRatio: number;
  nearLimit: boolean;
  storageBlocked: boolean;
  projectsBlocked: boolean;
};

export function computeUsage(input: {
  plan: PlanId;
  storageUsedBytes: number;
  activeProjects: number;
}): PlanUsage {
  const def = planOf(input.plan);
  const storageLimitBytes = storageBytesLimit(input.plan);
  const storageRatio =
    storageLimitBytes > 0
      ? Math.min(1, input.storageUsedBytes / storageLimitBytes)
      : 0;
  const projectsRatio =
    def.activeProjects > 0
      ? Math.min(1, input.activeProjects / def.activeProjects)
      : 0;
  return {
    plan: input.plan,
    storageUsedBytes: input.storageUsedBytes,
    storageLimitBytes,
    activeProjects: input.activeProjects,
    activeProjectsLimit: def.activeProjects,
    storageRatio,
    projectsRatio,
    nearLimit: storageRatio >= 0.8 || projectsRatio >= 0.8,
    storageBlocked: input.storageUsedBytes >= storageLimitBytes,
    projectsBlocked: input.activeProjects >= def.activeProjects,
  };
}
