import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Link2, Shield } from "lucide-react";
import { getStudioBySlug } from "@/actions/profile";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";

export default async function StudioLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const studio = await getStudioBySlug(slug);
  if (!studio) notFound();

  const title = studio.studio_name || studio.display_name || studio.slug;
  const handle = studio.slug ? `${studio.slug}.pofo.app` : null;

  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.995_0.003_85)]">
      <header className="flex h-16 items-center justify-between px-6">
        <Logo />
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-stone-500"
          asChild
        >
          <Link href="/login">Photographer sign in</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-24">
        <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
            Studio
          </p>
          <h1 className="mt-3 font-heading text-4xl font-medium text-stone-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-stone-500 leading-relaxed">
            Private client galleries are delivered with a secure link from your
            photographer — not listed here. Check the message or email they sent
            you.
          </p>

          {handle ? (
            <p className="mt-6 font-mono text-xs text-stone-400">{handle}</p>
          ) : null}

          <ul className="mt-8 space-y-3 text-sm text-stone-600">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                <Link2 className="h-3.5 w-3.5" />
              </span>
              <span>
                Open the unique gallery URL your photographer shared (starts
                with <span className="font-mono text-xs">/g/…</span>).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                <Shield className="h-3.5 w-3.5" />
              </span>
              <span>
                Some galleries ask for a password. Use the one they gave you —
                it isn’t recoverable from this page.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                <Camera className="h-3.5 w-3.5" />
              </span>
              <span>
                Tap hearts on photos to proof favorites. Your photographer sees
                the selection in their studio.
              </span>
            </li>
          </ul>

          <div className="mt-10 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-stone-300"
              asChild
            >
              <Link href="/">About Pofo</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
