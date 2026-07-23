import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
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
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-stone-900/5 bg-[oklch(0.97_0.01_75_/_0.6)] p-5 backdrop-blur-sm md:flex">
          <Link href="/" className="mb-10 px-1 text-stone-900">
            <Logo />
          </Link>
          <DashboardNav />
          <div className="mt-auto space-y-3 px-1">
            {demoMode && (
              <p className="rounded-sm bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950 ring-1 ring-amber-200/60">
                Demo studio — mock galleries until Supabase is connected.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full border-stone-300"
              asChild
            >
              <Link href="/">Marketing site</Link>
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-stone-900/5 px-4 md:hidden">
            <Link href="/">
              <Logo />
            </Link>
            <Button size="sm" variant="outline" className="rounded-full" asChild>
              <Link href="/dashboard/galleries">Galleries</Link>
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
