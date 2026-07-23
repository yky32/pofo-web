"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ExternalLink, Trash2 } from "lucide-react";
import {
  removePortfolioItem,
  setPortfolioItemPublished,
  type PortfolioItemRow,
} from "@/actions/portfolio";
import { PhotoImage } from "@/components/photo/photo-image";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export function PortfolioManager({
  items: initial,
  studioSlug,
  appUrl,
}: {
  items: PortfolioItemRow[];
  studioSlug: string | null;
  appUrl: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const publicHref = studioSlug
    ? `${appUrl}/s/${studioSlug}`
    : null;

  function togglePublished(item: PortfolioItemRow) {
    setError(null);
    startTransition(async () => {
      const next = !item.is_published;
      const res = await setPortfolioItemPublished({
        itemId: item.id,
        published: next,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_published: next } : i
        )
      );
      router.refresh();
    });
  }

  async function onRemove(item: PortfolioItemRow) {
    const ok = await confirm({
      title: "Remove from portfolio?",
      description: "The photo stays in the client gallery; only the portfolio listing is removed.",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const res = await removePortfolioItem(item.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    });
  }

  if (!items.length) {
    return (
      <div className="rounded-[8px] border border-stone-200/70 bg-white/40 px-6 py-14 text-center">
        <p className="font-heading text-xl text-stone-900">
          No portfolio photos yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
          Open a project’s Proofing tab and publish the client’s finished picks
          to your public studio page.
        </p>
        <Button className="mt-6 rounded-full" variant="secondary" asChild>
          <Link href="/dashboard/galleries">Go to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {publicHref ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-stone-200/80 bg-white/60 px-3 py-2.5">
          <p className="text-xs text-stone-500">
            Public page:{" "}
            <span className="font-mono text-stone-700">
              /s/{studioSlug}
            </span>
          </p>
          <Button size="sm" variant="outline" className="rounded-full" asChild>
            <Link href={`/s/${studioSlug}`} target="_blank">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View public
            </Link>
          </Button>
        </div>
      ) : (
        <p className="text-xs text-amber-800">
          Set a studio slug in Settings so clients can find your public
          portfolio.
        </p>
      )}

      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "overflow-hidden rounded-[8px] bg-white/70 ring-1 ring-stone-200/80",
              !item.is_published && "opacity-70"
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
              {!item.is_published ? (
                <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
                  Hidden
                </span>
              ) : null}
            </div>
            <div className="space-y-2 p-3">
              <div>
                <p className="truncate text-sm font-medium text-stone-900">
                  {item.title || item.filename || "Untitled"}
                </p>
                {item.project_title ? (
                  <p className="truncate text-[11px] text-stone-400">
                    {item.project_title}
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
                  className="h-8 rounded-full text-rose-700 hover:bg-rose-50"
                  disabled={pending}
                  onClick={() => void onRemove(item)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
