"use client";

import { useEffect, useState, useTransition } from "react";
import { Flag, Loader2, StickyNote, X } from "lucide-react";
import { updateShotStudioMeta } from "@/actions/shots";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioFlag } from "@/types/database";

const FLAGS: { value: StudioFlag; label: string }[] = [
  { value: "none", label: "None" },
  { value: "print", label: "Print" },
  { value: "retouch", label: "Retouch" },
  { value: "hero", label: "Hero" },
  { value: "reject", label: "Reject" },
];

export function flagBadgeClass(flag?: string | null) {
  switch (flag) {
    case "print":
      return "bg-emerald-600 text-white";
    case "retouch":
      return "bg-amber-500 text-white";
    case "hero":
      return "bg-violet-600 text-white";
    case "reject":
      return "bg-rose-600 text-white";
    default:
      return "bg-stone-700 text-white";
  }
}

export function flagShortLabel(flag?: string | null) {
  if (!flag || flag === "none") return null;
  return flag.charAt(0).toUpperCase() + flag.slice(1);
}

export function ShotStudioMetaPanel({
  projectId,
  shotId,
  filename,
  initialNote,
  initialFlag,
  onClose,
  onSaved,
}: {
  projectId: string;
  shotId: string;
  filename?: string | null;
  initialNote?: string | null;
  initialFlag?: string | null;
  onClose: () => void;
  onSaved?: (next: { note: string | null; flag: string | null }) => void;
}) {
  const [note, setNote] = useState(initialNote ?? "");
  const [flag, setFlag] = useState<StudioFlag>(
    (initialFlag as StudioFlag) || "none"
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setNote(initialNote ?? "");
    setFlag((initialFlag as StudioFlag) || "none");
    setError(null);
  }, [shotId, initialNote, initialFlag]);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateShotStudioMeta({
        projectId,
        shotId,
        studioNote: note,
        studioFlag: flag,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const nextFlag = flag === "none" ? null : flag;
      const nextNote = note.trim() || null;
      onSaved?.({ note: nextNote, flag: nextFlag });
      onClose();
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[180] flex justify-center p-3 sm:p-4">
      <div
        className="dialog-glass-overlay fixed inset-0 z-[-1]"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Studio note and flag"
        className="dialog-glass-panel w-full max-w-md rounded-2xl p-4 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-stone-900">Studio mark</p>
            <p className="truncate text-[11px] text-stone-500">
              {filename || "Photo"} · private to you
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
              <Flag className="h-3 w-3" />
              Flag
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FLAGS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFlag(f.value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                    flag === f.value
                      ? flagBadgeClass(f.value === "none" ? null : f.value) +
                          (f.value === "none"
                            ? " bg-stone-900 text-white"
                            : "")
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
              <StickyNote className="h-3 w-3" />
              Note
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Retouch skin, crop for album…"
              className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400"
            />
          </div>

          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-stone-900 text-white hover:bg-stone-800"
              disabled={pending}
              onClick={save}
            >
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
