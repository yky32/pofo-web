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
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col p-5 md:flex">
          <div className="glass absolute inset-y-0 left-0 w-56 rounded-none border-y-0 border-l-0" />
          <div className="relative flex h-full flex-col">
            <Link href="/" className="mb-10 px-1 text-stone-900">
              <Logo />
            </Link>
            <DashboardNav />
            <div className="mt-auto space-y-3 px-1">
              {demoMode && (
                <p className="glass-soft rounded-xl px-3 py-2.5 text-[11px] leading-relaxed text-stone-600">
                  Demo studio — mock galleries until Supabase is connected.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full border-stone-300/80 bg-white/40 backdrop-blur"
                asChild
              >
                <Link href="/">Marketing site</Link>
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="relative flex h-14 items-center justify-between px-4 md:hidden">
            <div className="glass absolute inset-0 rounded-none border-x-0 border-t-0" />
            <Link href="/" className="relative">
              <Logo />
            </Link>
            <Button
              size="sm"
              variant="outline"
              className="relative rounded-full bg-white/40 backdrop-blur"
              asChild
            >
              <Link href="/dashboard/galleries">Galleries</Link>
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
