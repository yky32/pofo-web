import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export function SiteHeader() {
  return (
    <header className="glass-light sticky top-0 z-40 border-b border-stone-900/5">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-foreground">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-stone-500 md:flex">
          <a href="#features" className="transition-colors hover:text-stone-900">
            Features
          </a>
          <a href="#workflow" className="transition-colors hover:text-stone-900">
            Workflow
          </a>
          <a href="#look" className="transition-colors hover:text-stone-900">
            Look
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-stone-600" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            className="rounded-full bg-stone-900 px-5 text-stone-50 hover:bg-stone-800"
            asChild
          >
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
