"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatGb,
  PLAN_ORDER,
  PLANS,
  priceLabel,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingWall({
  loggedIn = false,
  currentPlan = "free",
  className,
  id = "pricing",
}: {
  loggedIn?: boolean;
  currentPlan?: PlanId;
  className?: string;
  id?: string;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
            Pricing
          </p>
          <h2 className="mt-3 font-heading text-3xl font-medium text-stone-900 sm:text-4xl">
            Pay for space to deliver jobs
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-stone-500 sm:text-base">
            Not an all-in-one studio OS. Private galleries, proofing, and secure
            handoff — priced by storage.
          </p>

          <div
            className="mx-auto mt-8 flex w-fit items-center gap-0.5 rounded-full border border-stone-200 bg-stone-100/80 p-1"
            role="group"
            aria-label="Billing interval"
          >
            {(["monthly", "annual"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setInterval(v)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition",
                  interval === v
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                )}
              >
                {v === "monthly" ? "Monthly" : "Annual"}
                {v === "annual" ? (
                  <span className="ml-1 text-[10px] opacity-80">save</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const price = priceLabel(plan, interval);
            const popular = id === "solo";
            const isCurrent = loggedIn && currentPlan === id;
            const href = planCtaHref(id, loggedIn, interval);

            return (
              <div
                key={id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur-sm",
                  popular
                    ? "border-stone-900 ring-2 ring-stone-900/10 md:scale-[1.02]"
                    : "border-stone-200/90"
                )}
              >
                {plan.badge ? (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                    {plan.badge}
                  </span>
                ) : null}

                <div>
                  <h3 className="font-heading text-2xl font-medium text-stone-900">
                    {plan.name}
                  </h3>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="font-heading text-4xl font-medium text-stone-900">
                      {price.amount}
                    </span>
                    <span className="text-sm text-stone-400">{price.period}</span>
                  </p>
                  <p className="mt-3 text-sm font-medium text-stone-800">
                    {formatGb(plan.storageGb)} storage
                  </p>
                  <p className="text-xs text-stone-500">
                    {plan.activeProjects} active projects
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex gap-2 text-sm leading-snug text-stone-600"
                    >
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                        strokeWidth={2.5}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.limitsNote ? (
                  <p className="mt-4 text-[11px] leading-snug text-stone-400">
                    {plan.limitsNote}
                  </p>
                ) : null}

                <div className="mt-6">
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      disabled
                    >
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className={cn(
                        "w-full rounded-full",
                        popular
                          ? "bg-stone-900 text-white hover:bg-stone-800"
                          : "bg-stone-100 text-stone-900 hover:bg-stone-200"
                      )}
                      asChild
                    >
                      <Link href={href}>{plan.cta}</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-stone-500">
          All plans include private galleries, proofing, and secure share links.
        </p>
        <p className="mt-2 text-center text-xs text-stone-400">
          No print-store commissions. No complicated suite bundles. Pay for the
          space you need to deliver.
        </p>
      </div>
    </section>
  );
}

function planCtaHref(
  plan: PlanId,
  loggedIn: boolean,
  interval: BillingInterval
): string {
  if (plan === "free") {
    return loggedIn ? "/dashboard" : "/signup";
  }
  if (loggedIn) {
    return `/dashboard/settings/billing?plan=${plan}&interval=${interval}`;
  }
  return `/signup?plan=${plan}`;
}
