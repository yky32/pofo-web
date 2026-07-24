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
  /** Two-column layout for wide dialogs */
  wide = false,
}: {
  compact?: boolean;
  showCancel?: boolean;
  wide?: boolean;
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
  const labelCls = "text-xs font-medium text-stone-600";

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

  const titleField = (
    <div className={field}>
      <Label htmlFor="title" className={labelCls}>
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
  );

  const clientField = (
    <div className={field}>
      <Label htmlFor="client" className={labelCls}>
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
  );

  const tagsField = (
    <div className={field}>
      <Label htmlFor="tags" className={labelCls}>
        Tags
      </Label>
      <ProjectTagsField
        id="tags"
        name="tags"
        hint=""
        dense={false}
        className="space-y-2"
      />
    </div>
  );

  const dateField = (
    <div className={field}>
      <Label htmlFor="event_date" className={labelCls}>
        Event date
      </Label>
      <DateField id="event_date" name="event_date" placeholder="Pick date" />
    </div>
  );

  const limitField = (
    <div className={field}>
      <Label htmlFor="limit" className={labelCls}>
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
  );

  const locationField = (
    <div className={field}>
      <Label htmlFor="location" className={labelCls}>
        Locations
      </Label>
      <ProjectTagsField
        id="location"
        name="location"
        mode="locations"
        hint=""
        placeholder="Hong Kong, church, hotel…"
        className="space-y-2"
      />
    </div>
  );

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

  const serverError =
    state.error && !state.error.startsWith("PROJECTS_LIMIT") ? (
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
    ) : null;

  return (
    <>
      <form
        action={action}
        noValidate
        autoComplete="off"
        onSubmit={onSubmit}
        className={cn(
          !compact && "paper space-y-5 rounded-[5px] p-6",
          compact && !wide && "space-y-3.5",
          compact && wide && "space-y-5"
        )}
      >
        {wide ? (
          <>
            {/* Left: job identity · Right: when/where/limits */}
            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              <div className="space-y-3.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                  Job
                </p>
                {titleField}
                {clientField}
              </div>
              <div className="space-y-3.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                  Details
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {dateField}
                  {limitField}
                </div>
              </div>
            </div>
            {/* Full width chips — tags + multi-location */}
            {tagsField}
            {locationField}
            {serverError}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/60 pt-4">
              <p className="text-[11px] text-stone-400">
                You can edit all of this later in Settings.
              </p>
              {actions}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {titleField}
              {clientField}
            </div>
            {tagsField}
            <div className="grid gap-3 sm:grid-cols-2">
              {dateField}
              {limitField}
              <div className="sm:col-span-2">{locationField}</div>
            </div>
            {serverError}
            <div className="pt-1">{actions}</div>
          </>
        )}
      </form>
      <UpgradeModal
        open={upgradeOpen}
        reason="projects_limit"
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
