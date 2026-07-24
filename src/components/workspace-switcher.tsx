"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Building2, Check, ChevronDown, User } from "lucide-react";
import { setCurrentWorkspace } from "@/actions/teams";
import type { Team, WorkspaceContext } from "@/types/database";
import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useState } from "react";

export function WorkspaceSwitcher({
  workspace,
  teams,
  collapsed = false,
}: {
  workspace: WorkspaceContext;
  teams: Team[];
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function switchTo(kind: "personal" | "team", teamId?: string) {
    setOpen(false);
    startTransition(async () => {
      if (kind === "personal") {
        await setCurrentWorkspace({ kind: "personal" });
      } else if (teamId) {
        await setCurrentWorkspace({ kind: "team", teamId });
      }
      router.refresh();
    });
  }

  const label =
    workspace.kind === "personal"
      ? "Personal"
      : workspace.teamName || "Studio";

  if (collapsed) {
    return (
      <button
        type="button"
        title={label}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700"
      >
        {workspace.kind === "personal" ? (
          <User className="h-4 w-4" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-stone-200/90 bg-white px-2.5 py-2 text-left text-xs transition",
          "hover:bg-stone-50",
          open && "ring-2 ring-stone-300"
        )}
      >
        {workspace.kind === "personal" ? (
          <User className="h-3.5 w-3.5 shrink-0 text-stone-500" />
        ) : (
          <Building2 className="h-3.5 w-3.5 shrink-0 text-stone-500" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-stone-800">
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-stone-400 transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <ul
          id={menuId}
          className="absolute bottom-full left-0 z-50 mb-1.5 w-full overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs hover:bg-stone-50"
              onClick={() => switchTo("personal")}
            >
              <User className="h-3.5 w-3.5 text-stone-500" />
              <span className="flex-1 font-medium text-stone-800">Personal</span>
              {workspace.kind === "personal" ? (
                <Check className="h-3.5 w-3.5 text-stone-900" />
              ) : null}
            </button>
          </li>
          {teams.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs hover:bg-stone-50"
                onClick={() => switchTo("team", t.id)}
              >
                <Building2 className="h-3.5 w-3.5 text-stone-500" />
                <span className="min-w-0 flex-1 truncate font-medium text-stone-800">
                  {t.name}
                </span>
                {workspace.kind === "team" && workspace.teamId === t.id ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-stone-900" />
                ) : null}
              </button>
            </li>
          ))}
          {!teams.length ? (
            <li className="px-2.5 py-2 text-[10px] text-stone-400">
              No studio yet — create one in Settings
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
