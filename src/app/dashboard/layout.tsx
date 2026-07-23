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
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border/70 bg-card/50 p-5 md:flex">
          <Link href="/" className="mb-10 px-1 text-foreground">
            <Logo />
          </Link>
          <DashboardNav />
          <div className="mt-auto space-y-3 px-1">
            {demoMode && (
              <p className="rounded-lg bg-muted px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                Demo mode — mock data until Supabase is connected.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-md"
              asChild
            >
              <Link href="/">Site</Link>
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border/70 px-4 md:hidden">
            <Link href="/">
              <Logo />
            </Link>
            <Button size="sm" variant="outline" className="rounded-md" asChild>
              <Link href="/dashboard/galleries">Galleries</Link>
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
