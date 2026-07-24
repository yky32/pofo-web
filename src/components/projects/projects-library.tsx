"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { deleteProjects } from "@/actions/projects";
import { GalleryCard } from "@/components/photo/gallery-card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/database";

/**
 * Projects grid with multi-select bulk delete (library page).
 */
export function ProjectsLibrary({
  projects: initialProjects,
  demoMode = false,
}: {
  projects: Project[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [projects, setProjects] = useState(initialProjects);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [refreshPending, startRefresh] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [deletePhase, setDeletePhase] = useState<
    null | "removing" | "refreshing" | "done"
  >(null);
  const [deleteCount, setDeleteCount] = useState(0);
  const [fadingIds, setFadingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (deletePhase) return;
    setProjects(initialProjects);
  }, [initialProjects, deletePhase]);

  useEffect(() => {
    if (deletePhase !== "refreshing") return;
    if (refreshPending) return;
    setDeletePhase("done");
    const t = window.setTimeout(() => {
      setDeletePhase(null);
      setDeleteCount(0);
      setFadingIds(new Set());
    }, 650);
    return () => window.clearTimeout(t);
  }, [deletePhase, refreshPending]);

  const allIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const count = selected.size;
  const allSelected = projects.length > 0 && count === projects.length;
  const deleting =
    deletePhase === "removing" ||
    deletePhase === "refreshing" ||
    deletePhase === "done";

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
    setError(null);
  }

  async function onDelete() {
    if (!count || deleting || demoMode) return;
    const n = count;
    const ok = await confirm({
      title: n === 1 ? "Delete this project?" : `Delete ${n} projects?`,
      description:
        "This cannot be undone. Projects, photos, share links, and storage objects are removed.",
      confirmLabel: n === 1 ? "Delete project" : `Delete ${n}`,
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;

    const ids = [...selected];
    setError(null);
    setMessage(null);
    setDeleteCount(n);
    setFadingIds(new Set(ids));
    setDeletePhase("removing");

    await new Promise((r) => window.setTimeout(r, 200));

    startTransition(async () => {
      const res = await deleteProjects({ projectIds: ids });
      if (res.error) {
        setError(res.error);
        setDeletePhase(null);
        setFadingIds(new Set());
        setDeleteCount(0);
        return;
      }

      setProjects((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelected(new Set());
      setSelectMode(false);
      setMessage(res.success ?? `Deleted ${res.deleted ?? n}.`);
      setDeletePhase("refreshing");
      setFadingIds(new Set());

      startRefresh(() => {
        try {
          router.refresh();
        } catch {
          /* ignore */
        }
      });
    });
  }

  if (!projects.length && !deleting) {
    return null;
  }

  return (
    <div className="space-y-4">
      {mounted && deleting
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed inset-0 z-[240] flex items-end justify-center p-6 sm:items-center",
                "bg-stone-950/25 backdrop-blur-[2px] transition-opacity duration-300",
                deletePhase === "done" ? "opacity-0" : "opacity-100"
              )}
              aria-live="polite"
              aria-busy={deletePhase !== "done"}
            >
              <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      deletePhase === "done"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    )}
                  >
                    {deletePhase === "done" ? (
                      <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
                    ) : (
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        strokeWidth={1.75}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-stone-900">
                      {deletePhase === "done"
                        ? deleteCount === 1
                          ? "Project deleted"
                          : `${deleteCount} projects deleted`
                        : deletePhase === "removing"
                          ? deleteCount === 1
                            ? "Deleting project…"
                            : `Deleting ${deleteCount} projects…`
                          : "Updating library…"}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {deletePhase === "done"
                        ? "Library updated"
                        : "Removing jobs, photos, and storage"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      deletePhase === "done" ? "bg-emerald-600" : "bg-rose-700",
                      deletePhase === "refreshing" && "animate-pulse"
                    )}
                    style={{
                      width:
                        deletePhase === "removing"
                          ? "50%"
                          : deletePhase === "refreshing"
                            ? "90%"
                            : "100%",
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-400">
          {selectMode ? (
            count > 0 ? (
              <span className="font-medium text-stone-800">
                {count} selected
              </span>
            ) : (
              <span>Select projects to delete</span>
            )
          ) : (
            <span>
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {demoMode ? null : selectMode ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full text-stone-600"
                disabled={pending || deleting}
                onClick={toggleAll}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-rose-700 text-white hover:bg-rose-800"
                disabled={pending || deleting || count === 0}
                onClick={() => void onDelete()}
              >
                {pending || deleting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                {pending || deleting
                  ? "Deleting…"
                  : `Delete${count ? ` (${count})` : ""}`}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={pending || deleting}
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

      {projects.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const isOn = selected.has(project.id);
            const fading = fadingIds.has(project.id);
            return (
              <div
                key={project.id}
                className={cn(
                  "relative transition duration-300 ease-out",
                  fading && "scale-[0.97] opacity-35"
                )}
              >
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (deleting) return;
                      toggle(project.id);
                    }}
                    className={cn(
                      "absolute left-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition",
                      isOn
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-white/90 bg-black/30 text-transparent backdrop-blur-sm hover:bg-black/45"
                    )}
                    aria-label={
                      isOn
                        ? `Deselect ${project.title}`
                        : `Select ${project.title}`
                    }
                    aria-pressed={isOn}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                ) : null}
                <GalleryCard
                  gallery={project}
                  href={
                    selectMode
                      ? undefined
                      : `/dashboard/galleries/${project.id}`
                  }
                  onClick={
                    selectMode
                      ? () => {
                          if (deleting) return;
                          toggle(project.id);
                        }
                      : undefined
                  }
                  selected={selectMode && isOn}
                  className={cn(
                    selectMode && "cursor-pointer",
                    isOn && "ring-2 ring-stone-900 ring-offset-2"
                  )}
                />
              </div>
            );
          })}
        </div>
      ) : deleting ? (
        <div className="flex min-h-[10rem] items-center justify-center rounded-[8px] border border-dashed border-stone-200 bg-stone-50/50">
          <p className="text-sm text-stone-400">Updating library…</p>
        </div>
      ) : null}
    </div>
  );
}
