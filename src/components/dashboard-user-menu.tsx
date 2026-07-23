"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type DashboardUser = {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function initialsFrom(user: DashboardUser) {
  const name = user.displayName?.trim() || user.email?.trim() || "?";
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function DashboardUserMenu({
  user,
}: {
  user: DashboardUser | null;
  /** @deprecated always icon-only */
  collapsed?: boolean;
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(
    null
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Panel opens upward from avatar (sidebar bottom)
      setPos({
        bottom: Math.max(12, window.innerHeight - r.top + 8),
        left: Math.max(12, r.left),
      });
    }

    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const label =
    user?.displayName?.trim() ||
    user?.email?.trim() ||
    "Account";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="Account menu"
        title={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mx-auto flex rounded-full transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
          "hover:opacity-90"
        )}
      >
        <Avatar
          size="default"
          className={cn(
            "size-9 ring-2 ring-white shadow-sm",
            open && "ring-stone-300"
          )}
        >
          {user?.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="bg-stone-900 text-xs font-medium text-stone-50">
            {initialsFrom(user ?? {})}
          </AvatarFallback>
        </Avatar>
      </button>

      {mounted && open && pos
        ? createPortal(
            <>
              {/* Liquid glass veil (soccer-terminal feel) */}
              <div
                className="dialog-glass-overlay fixed inset-0 z-[200]"
                aria-hidden
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                id={menuId}
                role="menu"
                aria-label="Account"
                style={{ bottom: pos.bottom, left: pos.left }}
                className={cn(
                  "dialog-glass-panel fixed z-[201] w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl py-1.5",
                  "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
              >
                {(user?.displayName || user?.email) && (
                  <div className="border-b border-stone-900/5 px-3.5 py-3">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {user.displayName || "Studio"}
                    </p>
                    {user.email ? (
                      <p className="truncate text-xs text-stone-500">
                        {user.email}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="p-1.5">
                  <Link
                    href="/"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-stone-700 transition",
                      "hover:bg-stone-900/5 hover:text-stone-950"
                    )}
                  >
                    <ExternalLink
                      className="h-4 w-4 shrink-0 opacity-70"
                      strokeWidth={1.75}
                    />
                    Marketing
                  </Link>

                  <form action={signOut}>
                    <button
                      type="submit"
                      role="menuitem"
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-stone-700 transition",
                        "hover:bg-stone-900/5 hover:text-stone-950"
                      )}
                    >
                      <LogOut
                        className="h-4 w-4 shrink-0 opacity-70"
                        strokeWidth={1.75}
                      />
                      Log out
                    </button>
                  </form>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
