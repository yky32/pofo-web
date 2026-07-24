"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { createProject, type ProjectActionState } from "@/actions/projects";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { ProjectTagsField } from "@/components/projects/project-tags-field";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initial: ProjectActionState = {};

export function CreateProjectForm({
  compact = false,
  showCancel = true,
}: {
  /** Inside a dialog — no outer paper shell */
  compact?: boolean;
  showCancel?: boolean;
}) {
  const [state, action, pending] = useActionState(createProject, initial);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (state.error?.startsWith("PROJECTS_LIMIT")) {
      setUpgradeOpen(true);
    }
  }, [state.error]);

  const field = "space-y-1.5";
  const inputCls = "h-9 rounded-xl bg-white/90";

  return (
    <>
      <form
        action={action}
        className={cn(compact ? "space-y-4" : "paper space-y-5 rounded-[5px] p-6")}
      >
        {/* Title + client side by side */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={field}>
            <Label htmlFor="title" className="text-xs text-stone-600">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              required
              autoFocus={compact}
              placeholder="Alicia & James — Wedding"
              className={inputCls}
            />
          </div>
          <div className={field}>
            <Label htmlFor="client" className="text-xs text-stone-600">
              Client
            </Label>
            <Input
              id="client"
              name="client"
              placeholder="Alicia Chen"
              className={inputCls}
            />
          </div>
        </div>

        {/* Tags — compact */}
        <div className={field}>
          <Label htmlFor="tags" className="text-xs text-stone-600">
            Tags
          </Label>
          <ProjectTagsField
            id="tags"
            name="tags"
            hint=""
            dense
            className="space-y-1.5"
          />
        </div>

        {/* Date + limit | Location full width below */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={field}>
            <Label htmlFor="event_date" className="text-xs text-stone-600">
              Event date
            </Label>
            <DateField
              id="event_date"
              name="event_date"
              placeholder="Pick date"
            />
          </div>
          <div className={field}>
            <Label htmlFor="limit" className="text-xs text-stone-600">
              Proofing limit
            </Label>
            <Input
              id="limit"
              name="limit"
              type="number"
              defaultValue={40}
              min={1}
              max={200}
              className={inputCls}
            />
          </div>
          <div className={cn(field, "sm:col-span-2")}>
            <Label htmlFor="location" className="text-xs text-stone-600">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="Hong Kong · The Peninsula"
              className={inputCls}
            />
          </div>
        </div>

        {state.error && !state.error.startsWith("PROJECTS_LIMIT") ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {state.error}
          </p>
        ) : null}

        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            compact &&
              "sticky bottom-0 -mx-1 border-t border-stone-200/70 bg-white/80 px-1 pt-3 backdrop-blur-sm"
          )}
        >
          <Button
            type="submit"
            disabled={pending}
            className="rounded-full bg-stone-900 px-5 text-stone-50 hover:bg-stone-800"
          >
            {pending ? "Creating…" : "Create"}
          </Button>
          {showCancel ? (
            compact ? (
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-stone-300 bg-white/70"
                  />
                }
              >
                Cancel
              </DialogClose>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                asChild
              >
                <Link href="/dashboard/galleries">Cancel</Link>
              </Button>
            )
          ) : null}
        </div>
      </form>
      <UpgradeModal
        open={upgradeOpen}
        reason="projects_limit"
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
