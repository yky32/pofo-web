"use client";

import Link from "next/link";
import { Archive, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanUsage } from "@/lib/plans";
import { cn } from "@/lib/utils";

export type UpgradeBlockReason = "storage_limit" | "projects_limit";

export function UpgradeModal({
  open,
  reason,
  usage,
  onClose,
}: {
  open: boolean;
  reason: UpgradeBlockReason;
  usage?: PlanUsage | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const title =
    reason === "storage_limit"
      ? "Storage limit reached"
      : "Active project limit reached";

  const body =
    reason === "storage_limit"
      ? "You’ve used all free storage. Upgrade to Solo for 500GB, or free space by deleting photos."
      : "Free includes 3 active projects. Upgrade to Solo for 20, or archive a project to continue.";

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="dialog-glass-overlay absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="upgrade-modal-title"
        className={cn(
          "dialog-glass-panel relative z-10 w-full max-w-md rounded-2xl p-6 shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <h2
          id="upgrade-modal-title"
          className="mt-4 font-heading text-2xl font-medium text-stone-900"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{body}</p>
        {usage ? (
          <p className="mt-3 text-xs text-stone-400">
            Plan: {usage.plan} · Storage{" "}
            {Math.round(usage.storageRatio * 100)}% · Projects{" "}
            {usage.activeProjects}/{usage.activeProjectsLimit}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1 rounded-full" asChild>
            <Link href="/dashboard/settings/billing?plan=solo">
              Upgrade to Solo
            </Link>
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            asChild
          >
            <Link href="/dashboard/galleries">
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Manage projects
            </Link>
          </Button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-stone-400 underline-offset-2 hover:underline"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
