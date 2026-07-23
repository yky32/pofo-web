import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-neutral-900">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-10 text-sm text-neutral-500 md:flex">
          <a href="#features" className="transition-colors hover:text-neutral-900">
            Features
          </a>
          <a href="#workflow" className="transition-colors hover:text-neutral-900">
            Workflow
          </a>
          <a href="#look" className="transition-colors hover:text-neutral-900">
            Look
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-neutral-600" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            className="rounded-none bg-neutral-900 px-5 text-white hover:bg-neutral-800"
            asChild
          >
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
