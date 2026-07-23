"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { DashboardNav } from "@/components/dashboard-nav";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pofo-sidebar-collapsed";

export function DashboardShell({
  children,
  demoMode,
  showSignOut,
}: {
  children: React.ReactNode;
  demoMode: boolean;
  showSignOut: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside
          className={cn(
            "glass-light sticky top-0 hidden h-screen shrink-0 flex-col border-r border-stone-900/5 p-4 transition-[width] duration-200 ease-out md:flex",
            collapsed ? "w-[4.5rem]" : "w-56 p-5",
            !ready && "opacity-0"
          )}
        >
          <div
            className={cn(
              "mb-8 flex items-center gap-1",
              collapsed ? "flex-col gap-2" : "justify-between px-0.5"
            )}
          >
            <Link
              href="/"
              className={cn(
                "text-stone-900",
                collapsed && "flex justify-center"
              )}
              title="Pofo"
            >
              {collapsed ? (
                <Logo showWord={false} className="justify-center" />
              ) : (
                <Logo />
              )}
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] text-stone-400 transition-colors",
                "hover:bg-stone-900/5 hover:text-stone-800",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          </div>

          <DashboardNav collapsed={collapsed} />

          <div
            className={cn(
              "mt-auto space-y-3",
              collapsed ? "px-0" : "px-1"
            )}
          >
            {demoMode && !collapsed ? (
              <p className="paper rounded-[5px] px-3 py-2.5 text-[11px] leading-relaxed text-stone-600">
                Demo mode — add Supabase keys (see{" "}
                <code className="text-[10px]">supabase/SETUP.md</code>).
              </p>
            ) : null}
            {showSignOut ? (
              collapsed ? (
                <div className="flex justify-center">
                  <SignOutButton compact />
                </div>
              ) : (
                <SignOutButton />
              )
            ) : null}
            {collapsed ? (
              <Button
                variant="outline"
                size="icon"
                className="mx-auto rounded-full border-stone-200 bg-white/50"
                asChild
                title="Marketing site"
              >
                <Link href="/">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Marketing site</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full border-stone-200 bg-white/50"
                asChild
              >
                <Link href="/">Marketing site</Link>
              </Button>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-light flex h-14 items-center justify-between border-b border-stone-900/5 px-4 md:hidden">
            <Link href="/">
              <Logo />
            </Link>
            <Button size="sm" variant="outline" className="rounded-full" asChild>
              <Link href="/dashboard/galleries">Projects</Link>
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
