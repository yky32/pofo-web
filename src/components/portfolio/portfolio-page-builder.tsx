"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Save,
} from "lucide-react";
import { savePortfolioPage } from "@/actions/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  moveSection,
  parsePortfolioPage,
  sectionLabel,
  type PortfolioPageConfig,
  type PortfolioPageTheme,
  type PortfolioSection,
} from "@/lib/portfolio-page";
import { cn } from "@/lib/utils";

/**
 * Limited portfolio page builder:
 * theme · reorder sections (drag) · show/hide · edit section fields.
 * Not free-form HTML — fixed section types only.
 */
export function PortfolioPageBuilder({
  initial,
  studioName,
}: {
  initial: PortfolioPageConfig;
  studioName?: string | null;
}) {
  const router = useRouter();
  const [config, setConfig] = useState(() =>
    parsePortfolioPage(initial, studioName)
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    config.sections[0]?.id ?? null
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected =
    config.sections.find((s) => s.id === selectedId) ?? config.sections[0];

  function updateSection(id: string, patch: Partial<PortfolioSection>) {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === id ? ({ ...s, ...patch } as PortfolioSection) : s
      ),
    }));
  }

  function setTheme(theme: PortfolioPageTheme) {
    setConfig((prev) => ({ ...prev, theme }));
  }

  function onDragStart(id: string) {
    setDragId(id);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    setConfig((prev) => {
      const from = prev.sections.findIndex((s) => s.id === dragId);
      const to = prev.sections.findIndex((s) => s.id === targetId);
      return {
        ...prev,
        sections: moveSection(prev.sections, from, to),
      };
    });
    setDragId(null);
  }

  function moveBy(id: string, dir: -1 | 1) {
    setConfig((prev) => {
      const from = prev.sections.findIndex((s) => s.id === id);
      return {
        ...prev,
        sections: moveSection(prev.sections, from, from + dir),
      };
    });
  }

  function onSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await savePortfolioPage(config);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(res.success ?? "Saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
            Page design
          </p>
          <p className="mt-0.5 text-sm text-stone-500">
            Limited builder — reorder blocks, edit copy, pick a theme. Photos
            still come from the Photos tab.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full"
          disabled={pending}
          onClick={onSave}
        >
          {pending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Save design
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-emerald-700">{message}</p>
      ) : null}

      {/* Theme */}
      <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
          Theme
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              { id: "paper" as const, label: "Paper", swatch: "bg-stone-100" },
              { id: "ink" as const, label: "Ink", swatch: "bg-stone-900" },
              { id: "rose" as const, label: "Rose", swatch: "bg-rose-200" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                config.theme === t.id
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              )}
            >
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full ring-1 ring-black/10",
                  t.swatch
                )}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Section list */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-3">
            <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
              Sections · drag to reorder
            </p>
            <ul className="space-y-1.5">
              {config.sections.map((s, index) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={() => onDragStart(s.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(s.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-xl border bg-white px-1.5 py-1.5 transition",
                    selected?.id === s.id
                      ? "border-stone-900 ring-1 ring-stone-900/10"
                      : "border-stone-200/80",
                    dragId === s.id && "opacity-50",
                    !s.visible && "opacity-60"
                  )}
                >
                  <span
                    className="cursor-grab touch-none p-1 text-stone-400 active:cursor-grabbing"
                    title="Drag"
                    aria-hidden
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium text-stone-800"
                    onClick={() => setSelectedId(s.id)}
                  >
                    {sectionLabel(s.type)}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800"
                    onClick={() =>
                      updateSection(s.id, { visible: !s.visible })
                    }
                    title={s.visible ? "Hide section" : "Show section"}
                    aria-label={s.visible ? "Hide" : "Show"}
                  >
                    {s.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="rounded p-0.5 text-stone-400 hover:bg-stone-100 disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => moveBy(s.id, -1)}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-stone-400 hover:bg-stone-100 disabled:opacity-30"
                      disabled={index === config.sections.length - 1}
                      onClick={() => moveBy(s.id, 1)}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4 sm:p-5">
            {selected ? (
              <SectionEditor
                section={selected}
                onChange={(patch) => updateSection(selected.id, patch)}
              />
            ) : (
              <p className="text-sm text-stone-500">Select a section.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
}: {
  section: PortfolioSection;
  onChange: (patch: Partial<PortfolioSection>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Edit
          </p>
          <h3 className="font-heading text-xl text-stone-900">
            {sectionLabel(section.type)}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onChange({ visible: !section.visible })}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            section.visible
              ? "bg-emerald-50 text-emerald-800"
              : "bg-stone-100 text-stone-500"
          )}
        >
          {section.visible ? (
            <>
              <Eye className="h-3.5 w-3.5" /> Visible
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Hidden
            </>
          )}
        </button>
      </div>

      {section.type === "hero" ? (
        <div className="space-y-3">
          <Field label="Eyebrow">
            <Input
              value={section.eyebrow}
              onChange={(e) => onChange({ eyebrow: e.target.value })}
              maxLength={40}
              className="rounded-xl"
            />
          </Field>
          <Field label="Headline">
            <Input
              value={section.headline}
              onChange={(e) => onChange({ headline: e.target.value })}
              maxLength={80}
              className="rounded-xl"
            />
          </Field>
          <Field label="Subhead">
            <textarea
              value={section.subhead}
              onChange={(e) => onChange({ subhead: e.target.value })}
              maxLength={240}
              rows={3}
              className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
        </div>
      ) : null}

      {section.type === "gallery" ? (
        <div className="space-y-3">
          <Field label="Columns">
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ columns: n })}
                  className={cn(
                    "h-9 w-12 rounded-xl border text-sm font-medium",
                    section.columns === n
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={section.showCaptions}
              onChange={(e) => onChange({ showCaptions: e.target.checked })}
              className="rounded border-stone-300"
            />
            Show titles on photos
          </label>
          <p className="text-xs text-stone-400">
            Photos are managed in the Photos tab (publish / hide / remove).
          </p>
        </div>
      ) : null}

      {section.type === "about" ? (
        <div className="space-y-3">
          <Field label="Title">
            <Input
              value={section.title}
              onChange={(e) => onChange({ title: e.target.value })}
              maxLength={60}
              className="rounded-xl"
            />
          </Field>
          <Field label="Body">
            <textarea
              value={section.body}
              onChange={(e) => onChange({ body: e.target.value })}
              maxLength={1200}
              rows={6}
              className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
        </div>
      ) : null}

      {section.type === "services" ? (
        <div className="space-y-3">
          <Field label="Title">
            <Input
              value={section.title}
              onChange={(e) => onChange({ title: e.target.value })}
              maxLength={60}
              className="rounded-xl"
            />
          </Field>
          <Field label="Services (one per line)">
            <textarea
              value={section.items.join("\n")}
              onChange={(e) =>
                onChange({
                  items: e.target.value
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .slice(0, 12),
                })
              }
              rows={5}
              className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
        </div>
      ) : null}

      {section.type === "contact" ? (
        <div className="space-y-3">
          <Field label="Title">
            <Input
              value={section.title}
              onChange={(e) => onChange({ title: e.target.value })}
              maxLength={60}
              className="rounded-xl"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <Input
                type="email"
                value={section.email}
                onChange={(e) => onChange({ email: e.target.value })}
                maxLength={120}
                className="rounded-xl"
                placeholder="hello@studio.com"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={section.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                maxLength={40}
                className="rounded-xl"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button label">
              <Input
                value={section.ctaLabel}
                onChange={(e) => onChange({ ctaLabel: e.target.value })}
                maxLength={40}
                className="rounded-xl"
              />
            </Field>
            <Field label="Button link (optional)">
              <Input
                value={section.ctaHref}
                onChange={(e) => onChange({ ctaHref: e.target.value })}
                maxLength={240}
                className="rounded-xl"
                placeholder="https://… or leave empty for mailto"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {section.type === "footer" ? (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={section.showPofo}
            onChange={(e) => onChange({ showPofo: e.target.checked })}
            className="rounded border-stone-300"
          />
          Show “About Pofo” link
        </label>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-stone-600">{label}</Label>
      {children}
    </div>
  );
}
