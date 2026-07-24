"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Images,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  listPortfolioCandidates,
  publishShotsToPortfolio,
  type PortfolioCandidateShot,
} from "@/actions/portfolio";
import { PhotoImage } from "@/components/photo/photo-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pick any uploaded project photos for the public portfolio showcase.
 * Not limited to client proofing selections.
 */
export function PortfolioAddPicker({
  onClose,
}: {
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<
    { id: string; title: string; shot_count: number }[]
  >([]);
  const [shots, setShots] = useState<PortfolioCandidateShot[]>([]);
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listPortfolioCandidates().then((res) => {
      if (cancelled) return;
      setProjects(res.projects);
      setShots(res.shots);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    if (projectId === "all") return shots;
    return shots.filter((s) => s.project_id === projectId);
  }, [shots, projectId]);

  const selectable = visible.filter((s) => !s.in_portfolio && s.display_url);
  const selectedCount = selected.size;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of selectable) next.add(s.id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function onAdd() {
    if (!selectedCount) return;
    // Group by project for the action API
    const byProject = new Map<string, string[]>();
    for (const id of selected) {
      const shot = shots.find((s) => s.id === id);
      if (!shot || shot.in_portfolio) continue;
      const list = byProject.get(shot.project_id) ?? [];
      list.push(id);
      byProject.set(shot.project_id, list);
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      let total = 0;
      let failed: string | null = null;
      for (const [pid, ids] of byProject) {
        const res = await publishShotsToPortfolio({
          projectId: pid,
          shotIds: ids,
          markProjectFinal: false,
          publishLive: true,
        });
        if (res.error) {
          failed = res.error;
          break;
        }
        total += res.published ?? ids.length;
      }
      if (failed) {
        setError(failed);
        return;
      }
      setMessage(
        total === 1
          ? "Added 1 photo to portfolio."
          : `Added ${total} photos to portfolio.`
      );
      setSelected(new Set());
      // Refresh candidates
      const res = await listPortfolioCandidates();
      setProjects(res.projects);
      setShots(res.shots);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Add showcase photos
          </p>
          <p className="text-sm text-stone-600">
            Any uploaded project photo — not only client picks.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {onClose ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full p-0"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your photos…
        </div>
      ) : !projects.length ? (
        <div className="px-6 py-14 text-center">
          <Images className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 font-heading text-lg text-stone-900">
            No project photos yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
            Upload photos in a project, then come back to feature them on your
            public studio page.
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={projectId}
              onChange={(e) =>
                setProjectId(
                  e.target.value === "all" ? "all" : e.target.value
                )
              }
              className="h-9 rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 outline-none focus:ring-2 focus:ring-stone-300"
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.shot_count})
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-xs"
              onClick={selectAllVisible}
              disabled={!selectable.length}
            >
              Select available
            </Button>
            {selectedCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full text-xs"
                onClick={clearSelection}
              >
                Clear
              </Button>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              {selectedCount > 0 ? (
                <span className="text-xs text-stone-500">
                  {selectedCount} selected
                </span>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full"
                disabled={!selectedCount || pending}
                onClick={onAdd}
              >
                {pending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Add to portfolio
              </Button>
            </div>
          </div>

          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : null}
          {message ? (
            <p className="text-xs text-emerald-700">{message}</p>
          ) : null}

          <div className="grid max-h-[28rem] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
            {visible.map((shot) => {
              const on = selected.has(shot.id);
              const disabled = shot.in_portfolio || !shot.display_url;
              return (
                <button
                  key={shot.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(shot.id)}
                  title={
                    shot.in_portfolio
                      ? "Already in portfolio"
                      : shot.filename || shot.project_title
                  }
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200/80 transition",
                    disabled && "cursor-default opacity-55",
                    on && "ring-2 ring-stone-900"
                  )}
                >
                  {shot.display_url ? (
                    <PhotoImage
                      src={shot.display_url}
                      alt={shot.filename ?? "Photo"}
                      sizes="120px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-stone-400">
                      No preview
                    </span>
                  )}
                  {shot.in_portfolio ? (
                    <span className="absolute inset-x-0 bottom-0 bg-stone-900/70 px-1 py-0.5 text-center text-[9px] font-medium text-white">
                      In portfolio
                    </span>
                  ) : on ? (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
