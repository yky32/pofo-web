"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, LogOut, Mail } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  providerLabel,
  type AuthProviderId,
} from "@/lib/auth-identities";
import { cn } from "@/lib/utils";

export type DashboardUser = {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** How they signed in: google | apple | email | … */
  signInProvider?: AuthProviderId | null;
};

function initialsFrom(user: DashboardUser) {
  const name = user.displayName?.trim() || user.email?.trim() || "?";
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/** Small badge for which IdP the session is from (Triftly-style). */
function ProviderBadge({
  provider,
  className,
}: {
  provider?: AuthProviderId | null;
  className?: string;
}) {
  if (!provider) return null;

  const title = `Signed in with ${providerLabel(provider)}`;

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-200/90 bg-white shadow-sm",
        className
      )}
    >
      {provider === "google" ? (
        <GoogleMark className="h-3 w-3" />
      ) : provider === "apple" ? (
        <AppleMark className="h-3 w-3 text-stone-900" />
      ) : (
        <Mail className="h-2.5 w-2.5 text-stone-500" strokeWidth={2} />
      )}
    </span>
  );
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
          "flex shrink-0 rounded-full transition",
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
                  "dialog-glass-panel fixed z-[201] w-[min(13.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl py-1",
                  "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
              >
                {(user?.displayName || user?.email) && (
                  <div className="border-b border-stone-900/5 px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">
                        {user.displayName || "Studio"}
                      </p>
                      <ProviderBadge provider={user.signInProvider} />
                    </div>
                    {user.email ? (
                      <p className="mt-0.5 truncate text-[11px] text-stone-500">
                        {user.email}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="p-1">
                  <Link
                    href="/"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-stone-700 transition",
                      "hover:bg-stone-900/5 hover:text-stone-950"
                    )}
                  >
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 opacity-70"
                      strokeWidth={1.75}
                    />
                    Marketing
                  </Link>

                  <form action={signOut}>
                    <button
                      type="submit"
                      role="menuitem"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-stone-700 transition",
                        "hover:bg-stone-900/5 hover:text-stone-950"
                      )}
                    >
                      <LogOut
                        className="h-3.5 w-3.5 shrink-0 opacity-70"
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
