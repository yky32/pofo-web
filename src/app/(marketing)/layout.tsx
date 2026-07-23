import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/brand/logo";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      {children}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-neutral-900">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Client delivery, presented like a gallery wall.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-sm text-neutral-500">
            <Link href="/dashboard" className="hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-neutral-900">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-neutral-900">
              Start free
            </Link>
          </div>
          <p className="label-micro">© {new Date().getFullYear()} Pofo · v3</p>
        </div>
      </footer>
    </div>
  );
}
