"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { createProject, type ProjectActionState } from "@/actions/projects";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <>
    <form
      action={action}
      className={
        compact
          ? "space-y-5"
          : "paper space-y-5 rounded-[5px] p-6"
      }
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          autoFocus={compact}
          placeholder="Alicia & James — Wedding"
          className="rounded-xl bg-white/80"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client">Client name</Label>
        <Input
          id="client"
          name="client"
          placeholder="Alicia Chen"
          className="rounded-xl bg-white/80"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event_date">Event date</Label>
          <Input
            id="event_date"
            name="event_date"
            type="date"
            className="rounded-xl bg-white/80"
          />
          <p className="text-[11px] text-stone-400">
            When the shoot happened (for Memories)
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location">Location(s)</Label>
          <Input
            id="location"
            name="location"
            placeholder="Hong Kong · The Peninsula"
            className="rounded-xl bg-white/80"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="limit">Proofing limit</Label>
        <Input
          id="limit"
          name="limit"
          type="number"
          defaultValue={40}
          min={1}
          max={200}
          className="rounded-xl bg-white/80"
        />
      </div>

      {state.error && !state.error.startsWith("PROJECTS_LIMIT") ? (
        <p className="rounded-[5px] bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
        >
          {pending ? "Creating…" : "Create project"}
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
