"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  parseProjectTags,
  SUGGESTED_PROJECT_TAGS,
} from "@/lib/project-tags";
import { cn } from "@/lib/utils";

/**
 * Chip-style tag editor. Submits as comma-separated `name` hidden field.
 */
export function ProjectTagsField({
  name = "tags",
  id = "tags",
  defaultTags = [],
  suggestions = SUGGESTED_PROJECT_TAGS as unknown as string[],
  className,
  labelClassName,
  chipClassName,
  hint = "Job nature for filtering — wedding, commercial, custom…",
  dense = false,
}: {
  name?: string;
  id?: string;
  defaultTags?: string[];
  suggestions?: string[];
  className?: string;
  labelClassName?: string;
  chipClassName?: string;
  /** Empty string hides the hint line */
  hint?: string;
  /** Tighter chips for dialogs */
  dense?: boolean;
}) {
  const [tags, setTags] = useState<string[]>(() =>
    parseProjectTags(defaultTags)
  );
  const [draft, setDraft] = useState("");

  const selectedKeys = useMemo(
    () => new Set(tags.map((t) => t.toLowerCase())),
    [tags]
  );

  function addTag(raw: string) {
    const next = parseProjectTags([...tags, raw]);
    setTags(next);
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

  const unusedSuggestions = suggestions.filter(
    (s) => !selectedKeys.has(s.toLowerCase())
  );

  return (
    <div className={cn(dense ? "space-y-1.5" : "space-y-2", className)}>
      <input type="hidden" name={name} value={tags.join(", ")} />
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
            className="inline-flex items-center gap-0.5 rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-medium text-white"
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
          placeholder={tags.length ? "Add tag…" : "Wedding, commercial…"}
          className="min-w-[7rem] flex-1 bg-transparent py-0.5 text-sm text-stone-800 outline-none placeholder:text-stone-400"
          autoComplete="off"
        />
      </div>
      {unusedSuggestions.length ? (
        <div
          className={cn(
            "flex gap-1",
            dense
              ? "flex-nowrap overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "flex-wrap"
          )}
        >
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className={cn(
                "shrink-0 rounded-full border border-stone-200/90 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition",
                "hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900",
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
