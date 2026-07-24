"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  parseProjectTags,
  SUGGESTED_PROJECT_TAGS,
} from "@/lib/project-tags";
import {
  formatLocations,
  parseLocations,
  SUGGESTED_LOCATIONS,
} from "@/lib/project-locations";
import { cn } from "@/lib/utils";

type ChipMode = "tags" | "locations";

/**
 * Chip editor for project tags or multi-locations.
 * - tags → hidden value comma-separated (tags text[])
 * - locations → hidden value " · "-joined (location text)
 */
export function ProjectTagsField({
  name = "tags",
  id = "tags",
  defaultTags = [],
  suggestions,
  className,
  labelClassName,
  chipClassName,
  hint = "Job nature for filtering — wedding, commercial, custom…",
  dense = false,
  mode = "tags",
  placeholder,
}: {
  name?: string;
  id?: string;
  /** Initial chips — for locations pass split string via parseLocations */
  defaultTags?: string[];
  suggestions?: string[];
  className?: string;
  labelClassName?: string;
  chipClassName?: string;
  hint?: string;
  dense?: boolean;
  mode?: ChipMode;
  placeholder?: string;
}) {
  const isLoc = mode === "locations";
  const parse = isLoc ? parseLocations : parseProjectTags;
  const defaultSuggestions = isLoc
    ? (SUGGESTED_LOCATIONS as unknown as string[])
    : (SUGGESTED_PROJECT_TAGS as unknown as string[]);
  const sugg = suggestions ?? defaultSuggestions;
  const ph =
    placeholder ??
    (isLoc
      ? "Add place…"
      : "Wedding, commercial…");

  const [tags, setTags] = useState<string[]>(() => parse(defaultTags));
  const [draft, setDraft] = useState("");

  const selectedKeys = useMemo(
    () => new Set(tags.map((t) => t.toLowerCase())),
    [tags]
  );

  const hiddenValue = isLoc ? formatLocations(tags) : tags.join(", ");

  function addTag(raw: string) {
    setTags(parse([...tags, raw]));
    setDraft("");
  }

  function removeTag(tag: string) {
    const key = tag.toLowerCase();
    setTags((prev) => prev.filter((t) => t.toLowerCase() !== key));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  const unusedSuggestions = sugg.filter(
    (s) => !selectedKeys.has(s.toLowerCase())
  );

  return (
    <div className={cn(dense ? "space-y-1.5" : "space-y-2", className)}>
      <input type="hidden" name={name} value={hiddenValue} />
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-white/80 px-2 py-1.5 shadow-xs",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          chipClassName
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag.toLowerCase()}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              isLoc
                ? "bg-stone-800/90 text-white"
                : "bg-stone-900 text-white"
            )}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="ml-0.5 rounded-full p-0.5 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
          placeholder={tags.length ? (isLoc ? "Add place…" : "Add tag…") : ph}
          className="min-w-[7rem] flex-1 bg-transparent py-0.5 text-sm text-stone-800 outline-none placeholder:text-stone-400"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
        />
      </div>
      {unusedSuggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className={cn(
                "rounded-full border border-stone-200/90 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-stone-600 transition",
                "hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
                labelClassName
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? (
        <p className="text-[11px] text-stone-400">{hint}</p>
      ) : null}
    </div>
  );
}
