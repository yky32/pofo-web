import Link from "next/link";
import { notFound } from "next/navigation";
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

  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.995_0.003_85)]">
      <header className="flex h-16 items-center px-6">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
          Studio
        </p>
        <h1 className="mt-3 font-heading text-4xl font-medium text-stone-900">
          {title}
        </h1>
        <p className="mt-3 text-stone-500">
          Private client galleries are shared via a secure link from your
          photographer.
        </p>
        <p className="mt-8 font-mono text-xs text-stone-400">
          {studio.slug}.pofo.app
        </p>
        <div className="mt-10">
          <Button
            variant="outline"
            className="rounded-full border-stone-300"
            asChild
          >
            <Link href="/">About Pofo</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
