"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  Images,
  Link2,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import {
  removePortfolioItem,
  setPortfolioItemPublished,
  type PortfolioItemRow,
} from "@/actions/portfolio";
import { PortfolioAddPicker } from "@/components/portfolio/portfolio-add-picker";
import { PhotoImage } from "@/components/photo/photo-image";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { studioPublicBaseUrl } from "@/lib/host";
import { cn } from "@/lib/utils";

type Filter = "all" | "live" | "hidden";

export function PortfolioManager({
  items: initial,
  studioSlug,
  appUrl,
  studioName,
}: {
  items: PortfolioItemRow[];
  studioSlug: string | null;
  appUrl: string;
  studioName?: string | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const publicHref = studioSlug
    ? studioPublicBaseUrl(studioSlug, appUrl)
    : null;
  const publicLabel = publicHref
    ? publicHref.replace(/^https?:\/\//, "")
    : null;

  const liveCount = items.filter((i) => i.is_published).length;
  const hiddenCount = items.length - liveCount;

  const visible = useMemo(() => {
    if (filter === "live") return items.filter((i) => i.is_published);
    if (filter === "hidden") return items.filter((i) => !i.is_published);
    return items;
  }, [items, filter]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((i) => selected.has(i.id));

  async function copyPublic() {
    if (!publicHref) return;
    try {
      await navigator.clipboard.writeText(publicHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const i of visible) next.delete(i.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const i of visible) next.add(i.id);
        return next;
      });
    }
  }

  function setPublished(ids: string[], published: boolean) {
    if (!ids.length) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      let failed: string | null = null;
      for (const itemId of ids) {
        const res = await setPortfolioItemPublished({ itemId, published });
        if (res.error) {
          failed = res.error;
          break;
        }
      }
      if (failed) {
        setError(failed);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          ids.includes(i.id) ? { ...i, is_published: published } : i
        )
      );
      setSelected(new Set());
      setMessage(
        published
          ? ids.length === 1
            ? "Now live on your public page."
            : `${ids.length} photos now live.`
          : ids.length === 1
            ? "Hidden from public page."
            : `${ids.length} photos hidden.`
      );
      router.refresh();
    });
  }

  function togglePublished(item: PortfolioItemRow) {
    setPublished([item.id], !item.is_published);
  }

  async function onRemove(item: PortfolioItemRow) {
    const ok = await confirm({
      title: "Remove from portfolio?",
      description:
        "The photo stays in the client gallery; only the portfolio listing is removed.",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await removePortfolioItem(item.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setMessage("Removed from portfolio.");
      router.refresh();
    });
  }

  async function onRemoveSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirm({
      title:
        ids.length === 1
          ? "Remove this photo from portfolio?"
          : `Remove ${ids.length} photos from portfolio?`,
      description:
        "Photos stay in their client galleries; only portfolio listings are removed.",
      confirmLabel: ids.length === 1 ? "Remove" : `Remove ${ids.length}`,
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      let failed: string | null = null;
      for (const itemId of ids) {
        const res = await removePortfolioItem(itemId);
        if (res.error) {
          failed = res.error;
          break;
        }
      }
      if (failed) {
        setError(failed);
        return;
      }
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      setSelected(new Set());
      setMessage(
        ids.length === 1
          ? "Removed from portfolio."
          : `Removed ${ids.length} photos.`
      );
      router.refresh();
    });
  }

  /* ---------- Always: public surface + stats ---------- */
  const surface = (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/70 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
              Public studio
            </p>
            <p className="mt-0.5 truncate font-medium text-stone-900">
              {studioName || studioSlug || "Your studio"}
            </p>
            {publicLabel ? (
              <p
                className="mt-0.5 truncate font-mono text-[12px] text-stone-500"
                title={publicHref ?? undefined}
              >
                {publicLabel}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-amber-800">
                Set a studio link in Settings to publish a public URL.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full"
              onClick={() => setPickerOpen((v) => !v)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {pickerOpen ? "Close picker" : "Add photos"}
            </Button>
            {publicHref ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-full p-0"
                  onClick={() => void copyPublic()}
                  aria-label={copied ? "Copied" : "Copy public link"}
                  title={copied ? "Copied" : "Copy link"}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full px-3"
                  asChild
                >
                  <a
                    href={publicHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    View
                  </a>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full"
                asChild
              >
                <Link href="/dashboard/settings">
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  Settings
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-stone-100">
          <Stat label="In portfolio" value={items.length} />
          <Stat label="Live" value={liveCount} accent="emerald" />
          <Stat label="Hidden" value={hiddenCount} />
        </div>
      </div>

      {pickerOpen ? (
        <PortfolioAddPicker onClose={() => setPickerOpen(false)} />
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-emerald-700">{message}</p>
      ) : null}
    </div>
  );

  /* ---------- Empty ---------- */
  if (!items.length) {
    return (
      <div className="space-y-5">
        {surface}

        <div className="rounded-2xl border border-stone-200/70 bg-gradient-to-b from-white/80 to-stone-50/50 px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
              <Images className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h2 className="mt-4 font-heading text-2xl text-stone-900">
              Build your public portfolio
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Feature any uploaded project photos that show your style — not
              only client picks. Prospects see them on your studio page;
              private jobs stay on secret gallery links.
            </p>
          </div>

          <ol className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <Step
              n={1}
              title="Upload work"
              body="Add photos to any project (weddings, portraits, tests)."
            />
            <Step
              n={2}
              title="Add to portfolio"
              body="Use Add photos here, or Portfolio on a project."
            />
            <Step
              n={3}
              title="Design & share"
              body="Tune Page design, then share your studio link."
            />
          </ol>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Button
              className="rounded-full"
              type="button"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add photos
            </Button>
            <Button className="rounded-full" variant="outline" asChild>
              <Link href="/dashboard/galleries">
                <FolderOpen className="mr-1.5 h-4 w-4" />
                Go to projects
              </Link>
            </Button>
            {publicHref ? (
              <Button variant="outline" className="rounded-full" asChild>
                <a
                  href={publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Share2 className="mr-1.5 h-4 w-4" />
                  Preview public page
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Grid ---------- */
  const selectedCount = selected.size;

  return (
    <div className="space-y-5">
      {surface}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-full bg-stone-100/80 p-1">
          {(
            [
              { id: "all" as const, label: `All (${items.length})` },
              { id: "live" as const, label: `Live (${liveCount})` },
              { id: "hidden" as const, label: `Hidden (${hiddenCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                filter === f.id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {selectedCount > 0 ? (
            <>
              <span className="mr-1 text-xs font-medium text-stone-600">
                {selectedCount} selected
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full"
                disabled={pending}
                onClick={() => setPublished([...selected], true)}
              >
                <Eye className="mr-1 h-3.5 w-3.5" />
                Show
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full"
                disabled={pending}
                onClick={() => setPublished([...selected], false)}
              >
                <EyeOff className="mr-1 h-3.5 w-3.5" />
                Hide
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-8 rounded-full p-0 text-rose-700 hover:bg-rose-50"
                disabled={pending}
                onClick={() => void onRemoveSelected()}
                aria-label="Remove selected"
                title="Remove selected"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-stone-600"
              onClick={toggleSelectAllVisible}
            >
              <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
              {allVisibleSelected ? "Clear" : "Select"}
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center text-sm text-stone-500">
          No {filter === "live" ? "live" : "hidden"} photos in this filter.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => {
            const isOn = selected.has(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "overflow-hidden rounded-[10px] bg-white/80 ring-1 ring-stone-200/80 transition",
                  !item.is_published && "opacity-80",
                  isOn && "ring-2 ring-stone-900/80"
                )}
              >
                <div className="relative aspect-[4/5] bg-stone-100">
                  {item.display_url ? (
                    <PhotoImage
                      src={item.display_url}
                      alt={item.title ?? "Portfolio photo"}
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone-400">
                      No preview
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSelect(item.id)}
                    aria-label={isOn ? "Deselect" : "Select"}
                    className={cn(
                      "absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition",
                      isOn
                        ? "bg-stone-900 text-white"
                        : "bg-white/90 text-stone-500 hover:text-stone-900"
                    )}
                  >
                    {isOn ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded border border-stone-300" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      item.is_published
                        ? "bg-emerald-700/90 text-white"
                        : "bg-stone-900/80 text-white"
                    )}
                  >
                    {item.is_published ? "Live" : "Hidden"}
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <div>
                    <p className="truncate text-sm font-medium text-stone-900">
                      {item.title || item.filename || "Untitled"}
                    </p>
                    {item.project_title ? (
                      <p className="truncate text-[11px] text-stone-400">
                        {item.project_id ? (
                          <Link
                            href={`/dashboard/galleries/${item.project_id}`}
                            className="hover:text-stone-700 hover:underline"
                          >
                            {item.project_title}
                          </Link>
                        ) : (
                          item.project_title
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 rounded-full text-xs"
                      disabled={pending}
                      onClick={() => togglePublished(item)}
                    >
                      {item.is_published ? (
                        <>
                          <EyeOff className="mr-1 h-3 w-3" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-3 w-3" />
                          Show
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 rounded-full p-0 text-rose-700 hover:bg-rose-50"
                      disabled={pending}
                      onClick={() => void onRemove(item)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald";
}) {
  return (
    <div className="px-4 py-3 text-center sm:px-5 sm:text-left">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-medium tabular-nums text-stone-900",
          accent === "emerald" && value > 0 && "text-emerald-700"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-xl border border-stone-200/80 bg-white/80 px-3.5 py-3 text-left">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
        Step {n}
      </p>
      <p className="mt-1 text-sm font-medium text-stone-900">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{body}</p>
    </li>
  );
}
