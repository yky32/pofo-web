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
      <footer className="border-t border-stone-900/5 bg-stone-900 text-stone-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-stone-50">
              <Logo markClassName="text-stone-50" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-400">
              Private galleries, proofing, and clean delivery — made for working
              photographers.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-stone-400">
            <Link href="/dashboard" className="hover:text-stone-100">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-stone-100">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-stone-100">
              Start free
            </Link>
          </div>
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} Pofo
          </p>
        </div>
      </footer>
    </div>
  );
}
