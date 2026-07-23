"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { updateProjectStatus } from "@/actions/shots";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/database";

const STATUSES: {
  value: ProjectStatus;
  label: string;
  hint: string;
  chip: string;
}[] = [
  {
    value: "draft",
    label: "Draft",
    hint: "Not shared yet",
    chip: "bg-stone-100 text-stone-700",
  },
  {
    value: "shared",
    label: "Shared",
    hint: "Link sent to client",
    chip: "bg-sky-50 text-sky-800",
  },
  {
    value: "proofing",
    label: "Proofing",
    hint: "Client selecting",
    chip: "bg-amber-50 text-amber-900",
  },
  {
    value: "final",
    label: "Final",
    hint: "Delivery complete",
    chip: "bg-emerald-50 text-emerald-900",
  },
  {
    value: "archived",
    label: "Archived",
    hint: "Hidden from active",
    chip: "bg-stone-100 text-stone-500",
  },
];

/**
 * Free status control — photographer can jump to any status anytime.
 */
export function ProjectStatusControl({
  projectId,
  status,
  className,
}: {
  projectId: string;
  status: ProjectStatus;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  function setStatus(next: ProjectStatus) {
    if (next === status) {
      setOpen(false);
      return;
    }
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const res = await updateProjectStatus({
        projectId,
        status: next,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 text-xs font-medium transition",
          "hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
          pending && "opacity-60"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            current.chip
          )}
        >
          {current.label}
        </span>
        <span className="text-stone-500">Status</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-stone-400 transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close status menu"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className={cn(
              "dialog-glass-panel absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl py-1",
              "animate-in fade-in-0 zoom-in-95 duration-150"
            )}
          >
            {STATUSES.map((s) => {
              const active = s.value === status;
              return (
                <li key={s.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={pending}
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition",
                      active
                        ? "bg-stone-900/[0.04]"
                        : "hover:bg-stone-900/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-[4.5rem] rounded-full px-2 py-0.5 text-center text-[11px] font-medium",
                        s.chip
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="min-w-0 flex-1 text-[11px] text-stone-500">
                      {s.hint}
                    </span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-stone-700" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
