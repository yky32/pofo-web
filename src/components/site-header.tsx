import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-foreground">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-9 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#workflow" className="transition-colors hover:text-foreground">
            Workflow
          </a>
          <a href="#look" className="transition-colors hover:text-foreground">
            Look
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-muted-foreground" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            className="rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
