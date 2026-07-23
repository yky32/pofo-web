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
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-card p-4 md:flex">
          <Link href="/" className="mb-8 px-2">
            <Logo />
          </Link>
          <DashboardNav />
          <div className="mt-auto space-y-2 px-1">
            {demoMode && (
              <p className="rounded-md border border-steel/20 bg-steel/5 px-3 py-2 font-mono text-[10px] leading-relaxed text-steel">
                DEMO · mock data
              </p>
            )}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/">Site</Link>
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center justify-between border-b border-border px-4 md:hidden">
            <Link href="/">
              <Logo />
            </Link>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/galleries">Galleries</Link>
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
