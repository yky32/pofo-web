"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import {
  updateProjectSettings,
  type ProjectActionState,
} from "@/actions/projects";
import { ProjectStatusControl } from "@/components/projects/project-status-control";
import { ProjectTagsField } from "@/components/projects/project-tags-field";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitTwoLocations } from "@/lib/project-locations";
import type { ProjectStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const initial: ProjectActionState = {};

function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "—";
  try {
    return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return day;
  }
}

export function ProjectSettingsPanel({
  projectId,
  title,
  clientName,
  selectionLimit,
  status,
  eventDate,
  location,
  tags = [],
  isDemo = false,
}: {
  projectId: string;
  title: string;
  clientName?: string | null;
  selectionLimit: number;
  status: ProjectStatus;
  eventDate?: string | null;
  location?: string | null;
  tags?: string[] | null;
  isDemo?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    updateProjectSettings,
    initial
  );

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state.success]);

  return (
    <div className="max-w-lg space-y-5 rounded-[8px] border border-stone-200/70 bg-white/40 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <p className="font-heading text-xl text-stone-900">Project settings</p>
        {!isDemo && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit project settings"
            title="Edit"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-500 shadow-sm transition",
              "hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            )}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      {editing && !isDemo ? (
        <form action={action} className="space-y-4">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="space-y-1.5">
            <Label htmlFor="settings-title">Title</Label>
            <Input
              id="settings-title"
              name="title"
              required
              defaultValue={title}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-client">Client</Label>
            <Input
              id="settings-client"
              name="client"
              defaultValue={clientName ?? ""}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-tags">Tags</Label>
            <ProjectTagsField
              id="settings-tags"
              name="tags"
              defaultTags={tags ?? []}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-limit">Proofing limit</Label>
            <Input
              id="settings-limit"
              name="limit"
              type="number"
              min={1}
              max={200}
              defaultValue={selectionLimit}
              className="rounded-xl"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-event-date">Event date</Label>
              <DateField
                id="settings-event-date"
                name="event_date"
                defaultValue={eventDate?.slice(0, 10) ?? ""}
                placeholder="Event date"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {(() => {
                  const [a, b] = splitTwoLocations(location);
                  return (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="settings-location-1">Address 1</Label>
                        <Input
                          id="settings-location-1"
                          name="location_1"
                          defaultValue={a}
                          placeholder="Ceremony venue"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="settings-location-2">
                          Address 2{" "}
                          <span className="font-normal text-stone-400">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          id="settings-location-2"
                          name="location_2"
                          defaultValue={b}
                          placeholder="Reception venue"
                          className="rounded-xl"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-rose-600">{state.error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setEditing(false)}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
            <dt className="text-stone-400">Title</dt>
            <dd className="text-right text-stone-800">{title}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
            <dt className="text-stone-400">Client</dt>
            <dd className="text-right text-stone-800">{clientName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
            <dt className="text-stone-400">Tags</dt>
            <dd className="max-w-[65%] text-right">
              {tags?.length ? (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-stone-800">—</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
            <dt className="text-stone-400">Event date</dt>
            <dd className="text-right text-stone-800">
              {formatEventDate(eventDate)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
            <dt className="text-stone-400">Locations</dt>
            <dd className="max-w-[65%] text-right text-stone-800">
              {location?.trim() ? (
                <span className="inline-flex flex-col items-end gap-0.5">
                  {splitTwoLocations(location)
                    .filter(Boolean)
                    .map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                </span>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
            <dt className="text-stone-400">Proofing limit</dt>
            <dd className="text-right text-stone-800">{selectionLimit}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-stone-400">Status</dt>
            <dd className="text-right">
              {!isDemo ? (
                <ProjectStatusControl projectId={projectId} status={status} />
              ) : (
                <span className="text-stone-800">{status}</span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
