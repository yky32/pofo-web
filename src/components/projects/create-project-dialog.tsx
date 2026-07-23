"use client";

import { Plus } from "lucide-react";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TriggerVariant = "primary" | "hero" | "empty";

const triggerStyles: Record<TriggerVariant, string> = {
  primary:
    "w-fit rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800",
  hero: "w-fit rounded-full bg-white text-stone-900 hover:bg-stone-100",
  empty: "mt-6 rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800",
};

/**
 * Centered create-project dialog with liquid-glass overlay
 * (soccer-terminal / sample-terminal avatar-menu feel).
 */
export function CreateProjectDialog({
  triggerLabel = "New project",
  triggerVariant = "primary",
  triggerClassName,
  defaultOpen = false,
  configured = true,
}: {
  triggerLabel?: string;
  triggerVariant?: TriggerVariant;
  triggerClassName?: string;
  defaultOpen?: boolean;
  /** When false, still open dialog but form may fail — show note */
  configured?: boolean;
}) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger
        render={
          <Button
            className={cn(triggerStyles[triggerVariant], triggerClassName)}
          />
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        {triggerLabel}
      </DialogTrigger>

      <DialogContent
        showCloseButton
        overlayClassName="dialog-glass-overlay"
        className={cn(
          "dialog-glass-panel max-w-md gap-0 rounded-[12px] p-0 sm:max-w-md",
          "text-stone-900 ring-1 ring-white/60"
        )}
      >
        <div className="space-y-6 p-6 sm:p-7">
          <DialogHeader className="gap-1.5 pr-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">
              Create
            </p>
            <DialogTitle className="font-heading text-2xl font-medium tracking-tight text-stone-900 sm:text-3xl">
              New project
            </DialogTitle>
            <DialogDescription className="text-sm text-stone-500">
              One job / wedding / session. Upload comes next.
            </DialogDescription>
          </DialogHeader>

          {!configured ? (
            <div className="rounded-[5px] bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 ring-1 ring-amber-200/70">
              Supabase is not configured. Add keys in{" "}
              <code className="text-xs">.env.local</code>.
            </div>
          ) : null}

          <CreateProjectForm compact showCancel />
        </div>
      </DialogContent>
    </Dialog>
  );
}
