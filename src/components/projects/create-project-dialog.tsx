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
 * Create-project dialog — wider glass panel, dense 2-column form.
 */
export function CreateProjectDialog({
  triggerLabel = "New",
  triggerVariant = "primary",
  triggerClassName,
  defaultOpen = false,
  configured = true,
}: {
  triggerLabel?: string;
  triggerVariant?: TriggerVariant;
  triggerClassName?: string;
  defaultOpen?: boolean;
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
          "dialog-glass-panel gap-0 rounded-2xl p-0",
          "w-[min(100vw-1.5rem,34rem)] max-w-lg sm:max-w-lg",
          "text-stone-900 ring-1 ring-white/60"
        )}
      >
        <div className="flex max-h-[min(90vh,40rem)] flex-col">
          <DialogHeader className="shrink-0 gap-1 border-b border-stone-200/60 px-5 pb-3.5 pt-5 pr-12 sm:px-6 sm:pt-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">
              Create
            </p>
            <DialogTitle className="font-heading text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">
              New project
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500 sm:text-sm">
              Name the job — upload photos after.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            {!configured ? (
              <div className="mb-4 rounded-xl bg-amber-50/90 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200/70">
                Supabase is not configured. Add keys in{" "}
                <code className="text-xs">.env.local</code>.
              </div>
            ) : null}

            <CreateProjectForm compact showCancel />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
