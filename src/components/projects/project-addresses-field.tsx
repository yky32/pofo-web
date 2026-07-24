"use client";

import { useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  joinAddresses,
  splitAddresses,
} from "@/lib/project-locations";
import { cn } from "@/lib/utils";

const MAX = 12;

/**
 * Flexible multi-address list: user adds rows until done.
 * Submits as single hidden `location` value ( · -joined).
 */
export function ProjectAddressesField({
  name = "location",
  id = "location",
  defaultValue = "",
  className,
  inputClassName,
  labelClassName,
}: {
  name?: string;
  id?: string;
  /** Stored location string */
  defaultValue?: string | null;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const [lines, setLines] = useState<string[]>(() => {
    const parts = splitAddresses(defaultValue);
    // Always show at least one empty row if empty
    return parts.length ? parts : [""];
  });

  const stored = joinAddresses(lines);
  const canAdd = lines.length < MAX;

  function update(i: number, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? value : l)));
  }

  function remove(i: number) {
    setLines((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function add() {
    if (!canAdd) return;
    setLines((prev) => [...prev, ""]);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input type="hidden" name={name} value={stored} />

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200/80 bg-stone-50 text-stone-400",
                labelClassName
              )}
              aria-hidden
            >
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <Input
              id={i === 0 ? id : `${id}-${i + 1}`}
              value={line}
              onChange={(e) => update(i, e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              placeholder={
                i === 0
                  ? "Ceremony — St. John’s Cathedral"
                  : i === 1
                    ? "Reception — The Peninsula"
                    : `Place ${i + 1}`
              }
              className={cn(
                "h-9 flex-1 rounded-xl border-stone-200/90 bg-white shadow-none",
                inputClassName
              )}
            />
            {lines.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove address ${i + 1}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : (
              <span className="w-9 shrink-0" aria-hidden />
            )}
          </div>
        ))}
      </div>

      {canAdd ? (
        <button
          type="button"
          onClick={add}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-stone-600 transition",
            "hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
          )}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add address
        </button>
      ) : (
        <p className="text-[11px] text-stone-400">Maximum {MAX} places</p>
      )}
    </div>
  );
}
