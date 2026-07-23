import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/brand/logo";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {children}
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-foreground">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Space for the work — with a little warmth.
            </p>
          </div>
          <div className="flex flex-wrap gap-7 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Start free
            </Link>
          </div>
          <p className="label-quiet">© {new Date().getFullYear()} Pofo · v6</p>
        </div>
      </footer>
    </div>
  );
}
