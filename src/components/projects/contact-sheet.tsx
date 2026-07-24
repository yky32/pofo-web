"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Check, StickyNote, Trash2, X } from "lucide-react";
import { deleteProjectShots } from "@/actions/shots";
import { MosaicGrid } from "@/components/photo/mosaic-grid";
import {
  ShotStudioMetaPanel,
  flagBadgeClass,
  flagShortLabel,
} from "@/components/projects/shot-studio-meta";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export type ContactSheetItem = {
  id: string;
  src: string;
  alt: string;
  studio_note?: string | null;
  studio_flag?: string | null;
  /** jpeg | raw | paired | final | preview */
  kind?: string | null;
  /** companion RAW present */
  has_raw?: boolean;
  processing_status?: string | null;
};

/** Media type chip for photographer contact sheet */
function mediaBadge(
  kind?: string | null,
  hasRaw?: boolean,
  processing?: string | null
): { label: string; className: string } | null {
  if (kind === "paired" || (hasRaw && kind !== "raw")) {
    return {
      label: "JPEG+RAW",
      className: "bg-amber-500/95 text-amber-950",
    };
  }
  if (kind === "raw") {
    return {
      label: processing === "pending" ? "RAW · …" : "RAW",
      className: "bg-orange-600/95 text-white",
    };
  }
  // Normal / jpeg / final with web preview
  if (kind === "jpeg" || kind === "final" || kind === "preview" || !kind) {
    return {
      label: "JPEG",
      className: "bg-black/50 text-white backdrop-blur-sm",
    };
  }
  return null;
}

export function ContactSheet({
  projectId,
  items: initialItems,
}: {
  projectId: string;
  items: ContactSheetItem[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initialItems);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [metaShotId, setMetaShotId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const count = selected.size;
  const allSelected = items.length > 0 && count === items.length;
  const metaShot = metaShotId
    ? items.find((i) => i.id === metaShotId) ?? null
    : null;

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

  async function onDelete() {
    if (!count) return;
    const n = count;
    const ok = await confirm({
      title: n === 1 ? "Delete this photo?" : `Delete ${n} photos?`,
      description:
        "This cannot be undone. Photos are removed from the gallery and storage.",
      confirmLabel: n === 1 ? "Delete photo" : `Delete ${n}`,
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

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
          ) : (
            <span className="ml-1.5 text-stone-400">
              · tap a photo for notes
            </span>
          )}
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
                setMetaShotId(null);
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

      <MosaicGrid
        items={items}
        density="studio"
        onItemClick={(item) => {
          if (pending) return;
          if (selectMode) {
            toggle(item.id);
            return;
          }
          setMetaShotId(item.id);
        }}
        itemClassName={() => "cursor-pointer"}
        renderTile={({ item, image }) => {
          const isOn = selected.has(item.id);
          const full = items.find((i) => i.id === item.id);
          const flag = full?.studio_flag;
          const hasNote = Boolean(full?.studio_note?.trim());
          const label = flagShortLabel(flag);
          const media = mediaBadge(
            full?.kind,
            full?.has_raw,
            full?.processing_status
          );
          return (
            <>
              <div className="absolute inset-0">{image}</div>
              {selectMode ? (
                <span
                  className={cn(
                    "absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition",
                    isOn
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-white/90 bg-black/25 text-transparent backdrop-blur-sm"
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : (
                <>
                  <div className="absolute left-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] flex-wrap gap-1">
                    {label ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow",
                          flagBadgeClass(flag)
                        )}
                      >
                        {label}
                      </span>
                    ) : null}
                    {hasNote ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white shadow backdrop-blur-sm">
                        <StickyNote className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </div>
                  {media ? (
                    <span
                      className={cn(
                        "absolute bottom-1.5 left-1.5 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow",
                        media.className
                      )}
                    >
                      {media.label}
                    </span>
                  ) : null}
                </>
              )}
            </>
          );
        }}
      />

      {metaShot ? (
        <ShotStudioMetaPanel
          projectId={projectId}
          shotId={metaShot.id}
          filename={metaShot.alt}
          initialNote={metaShot.studio_note}
          initialFlag={metaShot.studio_flag}
          onClose={() => setMetaShotId(null)}
          onSaved={({ note, flag }) => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === metaShot.id
                  ? { ...i, studio_note: note, studio_flag: flag }
                  : i
              )
            );
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
