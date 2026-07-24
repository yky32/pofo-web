"use client";

import { useActionState, useEffect, useState } from "react";
import { Calendar, Check, MapPin, Pencil, X } from "lucide-react";
import {
  updateProjectMemory,
  type ProjectActionState,
} from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitTwoLocations } from "@/lib/project-locations";
import { cn } from "@/lib/utils";

const initial: ProjectActionState = {};

function formatEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // iso may be YYYY-MM-DD or full timestamp
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  try {
    const d = new Date(`${day}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return day;
  }
}

/**
 * Hero metadata: when/where the job happened.
 * Empty → soft prompt to add (for Memories filter later).
 */
export function ProjectMemoryMeta({
  projectId,
  eventDate,
  location,
  variant = "hero",
}: {
  projectId: string;
  eventDate?: string | null;
  location?: string | null;
  /** hero = on cover; plain = light surface */
  variant?: "hero" | "plain";
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateProjectMemory, initial);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state.success]);

  const dateLabel = formatEventDate(eventDate);
  const loc = location?.trim() || null;
  const empty = !dateLabel && !loc;
  const onHero = variant === "hero";

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "group mt-2 flex max-w-xl flex-wrap items-center gap-x-3 gap-y-1 text-left text-sm transition",
          onHero
            ? "text-white/75 hover:text-white"
            : "text-stone-500 hover:text-stone-800"
        )}
      >
        {empty ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
              onHero
                ? "border-white/25 bg-white/10"
                : "border-dashed border-stone-300 bg-stone-50"
            )}
          >
            <Calendar className="h-3 w-3 opacity-80" strokeWidth={1.75} />
            <MapPin className="h-3 w-3 opacity-80" strokeWidth={1.75} />
            Add date &amp; location
            <Pencil className="ml-0.5 h-3 w-3 opacity-60" strokeWidth={1.75} />
          </span>
        ) : (
          <>
            {dateLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
                {dateLabel}
              </span>
            ) : null}
            {loc ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
                <span className="truncate">{loc}</span>
              </span>
            ) : null}
            <Pencil
              className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-70"
              strokeWidth={1.75}
            />
          </>
        )}
      </button>
    );
  }

  const defaultDate = eventDate?.slice(0, 10) || "";

  return (
    <form
      action={action}
      className={cn(
        "mt-3 max-w-md space-y-2.5 rounded-xl p-3",
        onHero
          ? "bg-stone-950/55 ring-1 ring-white/15 backdrop-blur-md"
          : "border border-stone-200 bg-white shadow-sm"
      )}
    >
      <input type="hidden" name="project_id" value={projectId} />
      <p
        className={cn(
          "text-[10px] font-medium uppercase tracking-[0.14em]",
          onHero ? "text-white/55" : "text-stone-400"
        )}
      >
        Memories · when &amp; where
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label
            htmlFor="event_date"
            className={cn(
              "text-[11px]",
              onHero ? "text-white/70" : "text-stone-600"
            )}
          >
            Event date
          </Label>
          <DateField
            id="event_date"
            name="event_date"
            defaultValue={defaultDate}
            placeholder="Event date"
            variant={onHero ? "hero" : "default"}
          />
        </div>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          {(() => {
            const [a, b] = splitTwoLocations(location);
            const inputCls = cn(
              "h-9 rounded-lg text-sm",
              onHero
                ? "border-white/20 bg-white/10 text-white placeholder:text-white/40"
                : "bg-white"
            );
            const labelCls = cn(
              "text-[11px]",
              onHero ? "text-white/70" : "text-stone-600"
            );
            return (
              <>
                <div className="space-y-1">
                  <Label htmlFor="location_1" className={labelCls}>
                    Address 1
                  </Label>
                  <Input
                    id="location_1"
                    name="location_1"
                    defaultValue={a}
                    placeholder="Ceremony venue"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location_2" className={labelCls}>
                    Address 2
                  </Label>
                  <Input
                    id="location_2"
                    name="location_2"
                    defaultValue={b}
                    placeholder="Reception (optional)"
                    className={inputCls}
                  />
                </div>
              </>
            );
          })()}
        </div>
      </div>
      {state.error ? (
        <p
          className={cn(
            "text-xs",
            onHero ? "text-rose-200" : "text-rose-600"
          )}
        >
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-0.5">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className={cn(
            "h-8 rounded-full px-3 text-xs",
            onHero
              ? "bg-white text-stone-900 hover:bg-white/90"
              : "bg-stone-900 text-white"
          )}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-8 rounded-full px-3 text-xs",
            onHero ? "text-white/80 hover:bg-white/10 hover:text-white" : ""
          )}
          onClick={() => setEditing(false)}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
