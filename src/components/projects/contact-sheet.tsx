"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { deleteProjectShots } from "@/actions/shots";
import { PhotoImage } from "@/components/photo/photo-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ContactSheetItem = {
  id: string;
  src: string;
  alt: string;
};

export function ContactSheet({
  projectId,
  items,
}: {
  projectId: string;
  items: ContactSheetItem[];
}) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const count = selected.size;
  const allSelected = items.length > 0 && count === items.length;

  const exitSelect = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
    setError(null);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function onDelete() {
    if (!count) return;
    const n = count;
    if (
      !window.confirm(
        n === 1
          ? "Delete this photo? This cannot be undone."
          : `Delete ${n} photos? This cannot be undone.`
      )
    ) {
      return;
    }

    const ids = [...selected];
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await deleteProjectShots({
        projectId,
        shotIds: ids,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(res.success ?? `Deleted ${res.deleted ?? n}.`);
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    });
  }

  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-500">
          {items.length} photo{items.length === 1 ? "" : "s"}
          {selectMode && count > 0 ? (
            <span className="ml-1.5 font-medium text-stone-800">
              · {count} selected
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selectMode ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full text-stone-600"
                disabled={pending}
                onClick={toggleAll}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-rose-700 text-white hover:bg-rose-800"
                disabled={pending || count === 0}
                onClick={onDelete}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {pending ? "Deleting…" : `Delete${count ? ` (${count})` : ""}`}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={pending}
                onClick={exitSelect}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-stone-300"
              onClick={() => {
                setSelectMode(true);
                setMessage(null);
                setError(null);
              }}
            >
              Select
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-emerald-700">{message}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
        {items.map((item) => {
          const isOn = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={pending}
              onClick={() => {
                if (selectMode) toggle(item.id);
              }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-[6px] bg-stone-100 text-left",
                selectMode && "cursor-pointer ring-offset-2",
                selectMode && isOn && "ring-2 ring-stone-900",
                selectMode && !isOn && "hover:ring-2 hover:ring-stone-300",
                !selectMode && "cursor-default"
              )}
            >
              <PhotoImage
                src={item.src}
                alt={item.alt}
                sizes="16vw"
                className={cn(
                  "transition duration-500",
                  !selectMode && "group-hover:scale-105",
                  selectMode && isOn && "opacity-90"
                )}
              />
              {selectMode ? (
                <span
                  className={cn(
                    "absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition",
                    isOn
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-white/90 bg-black/25 text-transparent backdrop-blur-sm"
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
