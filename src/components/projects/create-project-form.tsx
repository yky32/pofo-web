"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (state.error?.startsWith("PROJECTS_LIMIT")) {
      setUpgradeOpen(true);
    }
  }, [state.error]);

  const field = "space-y-1";
  const inputCls =
    "h-9 rounded-xl border-stone-200/90 bg-white shadow-none";

  function validateTitle(value: string): string | null {
    const t = value.trim();
    if (!t) return "Add a project title";
    if (t.length < 2) return "Title is too short";
    return null;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const err = validateTitle(title);
    if (err) {
      e.preventDefault();
      setTitleError(err);
      return;
    }
    setTitleError(null);
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
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
                className="rounded-full border-stone-300 bg-white"
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
  );

  return (
    <>
      <form
        action={action}
        noValidate
        autoComplete="off"
        onSubmit={onSubmit}
        className={cn(
          compact ? "space-y-3.5" : "paper space-y-5 rounded-[5px] p-6"
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={field}>
            <Label htmlFor="title" className="text-xs font-medium text-stone-600">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(validateTitle(e.target.value));
              }}
              onBlur={() => {
                if (title.trim() || titleError) {
                  setTitleError(validateTitle(title));
                }
              }}
              autoFocus={compact}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              placeholder="Alicia & James — Wedding"
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "title-error" : undefined}
              className={cn(
                inputCls,
                titleError &&
                  "border-rose-300 bg-rose-50/30 focus-visible:border-rose-400 focus-visible:ring-rose-200/50"
              )}
            />
            {titleError ? (
              <p
                id="title-error"
                className="flex items-center gap-1 text-[11px] text-rose-600"
              >
                <AlertCircle className="h-3 w-3 shrink-0" strokeWidth={2} />
                {titleError}
              </p>
            ) : null}
          </div>
          <div className={field}>
            <Label htmlFor="client" className="text-xs font-medium text-stone-600">
              Client
            </Label>
            <Input
              id="client"
              name="client"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              placeholder="Alicia Chen"
              className={inputCls}
            />
          </div>
        </div>

        <div className={field}>
          <Label htmlFor="tags" className="text-xs font-medium text-stone-600">
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={field}>
            <Label
              htmlFor="event_date"
              className="text-xs font-medium text-stone-600"
            >
              Event date
            </Label>
            <DateField
              id="event_date"
              name="event_date"
              placeholder="Pick date"
            />
          </div>
          <div className={field}>
            <Label htmlFor="limit" className="text-xs font-medium text-stone-600">
              Proofing limit
            </Label>
            <Input
              id="limit"
              name="limit"
              type="number"
              defaultValue={40}
              min={1}
              max={200}
              autoComplete="off"
              className={inputCls}
            />
          </div>
          <div className={cn(field, "sm:col-span-2")}>
            <Label
              htmlFor="location"
              className="text-xs font-medium text-stone-600"
            >
              Location
            </Label>
            <Input
              id="location"
              name="location"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              placeholder="Hong Kong · The Peninsula"
              className={inputCls}
            />
          </div>
        </div>

        {state.error && !state.error.startsWith("PROJECTS_LIMIT") ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
              strokeWidth={1.75}
            />
            <p className="leading-snug">{state.error}</p>
          </div>
        ) : null}

        {/* In-dialog: actions sit in normal flow (no sticky overflow) */}
        <div className={cn(compact ? "pt-1" : "pt-1")}>{actions}</div>
      </form>
      <UpgradeModal
        open={upgradeOpen}
        reason="projects_limit"
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
