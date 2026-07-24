"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  forgetUserCustomTag,
  getMyTagSuggestions,
  rememberUserCustomTag,
} from "@/actions/projects";
import {
  formatTagLabel,
  isSystemProjectTag,
  parseProjectTags,
  SUGGESTED_PROJECT_TAGS,
} from "@/lib/project-tags";
import { cn } from "@/lib/utils";

/**
 * Chip editor for project tags.
 * System starters + this user’s customs; “+ Custom” for new personal tags.
 */
export function ProjectTagsField({
  name = "tags",
  id = "tags",
  defaultTags = [],
  suggestions: suggestionsProp,
  className,
  labelClassName,
  chipClassName,
  hint = "",
  dense = false,
  /** Load per-user suggestions (default true) */
  loadUserSuggestions = true,
}: {
  name?: string;
  id?: string;
  defaultTags?: string[];
  suggestions?: string[];
  className?: string;
  labelClassName?: string;
  chipClassName?: string;
  hint?: string;
  dense?: boolean;
  loadUserSuggestions?: boolean;
}) {
  const [tags, setTags] = useState<string[]>(() =>
    parseProjectTags(defaultTags)
  );
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(
    () =>
      suggestionsProp ??
      ([...SUGGESTED_PROJECT_TAGS] as string[])
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (suggestionsProp) {
      setSuggestions(suggestionsProp);
      return;
    }
    if (!loadUserSuggestions) return;
    let cancelled = false;
    void getMyTagSuggestions().then((list) => {
      if (!cancelled && list?.length) setSuggestions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [suggestionsProp, loadUserSuggestions]);

  useEffect(() => {
    if (customOpen) {
      requestAnimationFrame(() => customRef.current?.focus());
    }
  }, [customOpen]);

  const selectedKeys = useMemo(
    () => new Set(tags.map((t) => t.toLowerCase())),
    [tags]
  );

  async function persistIfCustom(tag: string) {
    if (isSystemProjectTag(tag)) return;
    const res = await rememberUserCustomTag(tag);
    if (res.ok) {
      setSuggestions((prev) => {
        const next = parseProjectTags([...prev, tag]);
        return next;
      });
    }
  }

  function addTag(raw: string) {
    const next = parseProjectTags([...tags, raw]);
    const added = next.filter(
      (t) => !tags.some((x) => x.toLowerCase() === t.toLowerCase())
    );
    setTags(next);
    setDraft("");
    setCustomDraft("");
    setCustomOpen(false);
    for (const t of added) {
      void persistIfCustom(t);
    }
  }

  function removeTag(tag: string) {
    const key = tag.toLowerCase();
    setTags((prev) => prev.filter((t) => t.toLowerCase() !== key));
  }

  /** Drop a personal custom from suggestions (+ deselect if active). */
  function forgetSuggestion(tag: string) {
    if (isSystemProjectTag(tag)) return;
    const key = tag.toLowerCase();
    setSuggestions((prev) => prev.filter((t) => t.toLowerCase() !== key));
    removeTag(tag);
    void forgetUserCustomTag(tag);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  function onCustomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (customDraft.trim()) addTag(customDraft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCustomOpen(false);
      setCustomDraft("");
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
            className="inline-flex items-center gap-0.5 rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-medium text-white"
          >
            {formatTagLabel(tag)}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${formatTagLabel(tag)}`}
              className="ml-0.5 rounded p-0.5 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
          placeholder={tags.length ? "Add #tag…" : "Pick or type a #tag…"}
          className="min-w-[7rem] flex-1 bg-transparent py-0.5 text-sm text-stone-800 outline-none placeholder:text-stone-400"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {unusedSuggestions.map((s) => {
          const isCustom = !isSystemProjectTag(s);
          return (
            <span
              key={s}
              className={cn(
                "inline-flex items-center rounded-md border border-stone-200/90 bg-white/90 text-[11px] font-medium text-stone-600 transition",
                "hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900",
                isCustom && "border-stone-300 bg-stone-50",
                labelClassName
              )}
            >
              <button
                type="button"
                onClick={() => addTag(s)}
                className={cn(
                  "px-2.5 py-1 focus-visible:outline-none",
                  isCustom && "pr-1"
                )}
                title={isCustom ? "Your custom tag — click to use" : undefined}
              >
                + {formatTagLabel(s)}
              </button>
              {isCustom ? (
                <button
                  type="button"
                  onClick={() => forgetSuggestion(s)}
                  aria-label={`Remove custom tag ${formatTagLabel(s)}`}
                  title="Remove from your tags"
                  className="mr-1 rounded p-0.5 text-stone-400 transition hover:bg-stone-200/80 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                >
                  <X className="h-3 w-3" strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </span>
          );
        })}

        {/* Always offer custom — for tags that don’t exist yet */}
        {!customOpen ? (
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-dashed border-stone-300 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 transition",
              "hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
              labelClassName
            )}
          >
            <Pencil className="h-3 w-3" strokeWidth={2} />
            Custom
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-stone-50 py-0.5 pl-2.5 pr-1">
            <input
              ref={customRef}
              type="text"
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={onCustomKeyDown}
              onBlur={() => {
                if (customDraft.trim()) addTag(customDraft);
                else setCustomOpen(false);
              }}
              placeholder="#your-tag"
              maxLength={24}
              className="w-24 bg-transparent text-[11px] font-medium text-stone-800 outline-none placeholder:text-stone-400 sm:w-28"
              autoComplete="off"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (customDraft.trim()) addTag(customDraft);
                else {
                  setCustomOpen(false);
                  setCustomDraft("");
                }
              }}
              className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white"
            >
              Add
            </button>
          </span>
        )}
      </div>

      {hint ? (
        <p className="text-[11px] text-stone-400">{hint}</p>
      ) : null}
    </div>
  );
}
