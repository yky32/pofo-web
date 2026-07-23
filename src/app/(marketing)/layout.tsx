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
      <footer className="relative border-t border-white/40">
        <div className="glass absolute inset-0 rounded-none border-0" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-foreground">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Private galleries, proofing, and clean delivery — made for working
              photographers.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
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
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pofo · Design v1.1
          </p>
        </div>
      </footer>
    </div>
  );
}
