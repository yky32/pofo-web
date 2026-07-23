import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { isSupabaseConfigured } from "@/lib/env";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demoMode = !isSupabaseConfigured();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="glass-light sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-stone-900/5 p-5 md:flex">
          <Link href="/" className="mb-10 px-1 text-stone-900">
            <Logo />
          </Link>
          <DashboardNav />
          <div className="mt-auto space-y-3 px-1">
            {demoMode && (
              <p className="paper rounded-[5px] px-3 py-2.5 text-[11px] leading-relaxed text-stone-600">
                Demo mode — add Supabase keys (see{" "}
                <code className="text-[10px]">supabase/SETUP.md</code>).
              </p>
            )}
            {isSupabaseConfigured() ? <SignOutButton /> : null}
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full border-stone-200 bg-white/50"
              asChild
            >
              <Link href="/">Marketing site</Link>
            </Button>
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
