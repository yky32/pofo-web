import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Link2, Shield } from "lucide-react";
import { getPublicPortfolio } from "@/actions/portfolio";
import { getStudioBySlug } from "@/actions/profile";
import { Logo } from "@/components/brand/logo";
import { PhotoImage } from "@/components/photo/photo-image";
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

  const portfolio = await getPublicPortfolio(slug);
  const items =
    "error" in portfolio ? [] : portfolio.items.filter((i) => i.display_url);

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24">
        <div className="mx-auto max-w-2xl pt-10 text-center sm:pt-16">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
            Studio
          </p>
          <h1 className="mt-3 font-heading text-4xl font-medium text-stone-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-stone-500 leading-relaxed">
            {items.length
              ? "Selected work from recent deliveries."
              : "Private client galleries are shared via a secure link from your photographer."}
          </p>
          {handle ? (
            <p className="mt-4 font-mono text-xs text-stone-400">{handle}</p>
          ) : null}
        </div>

        {items.length > 0 ? (
          <div className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
            {items.map((item) => (
              <figure
                key={item.id}
                className="group relative aspect-[4/5] overflow-hidden rounded-[6px] bg-stone-100"
              >
                <PhotoImage
                  src={item.display_url!}
                  alt={item.title ?? "Portfolio"}
                  sizes="(max-width:768px) 50vw, 25vw"
                  className="transition duration-500 group-hover:scale-[1.03]"
                />
                {(item.title || item.project_title) && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2.5 pt-8">
                    <p className="truncate text-xs font-medium text-white">
                      {item.title}
                    </p>
                    {item.project_title ? (
                      <p className="truncate text-[10px] text-white/70">
                        {item.project_title}
                      </p>
                    ) : null}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-stone-200/80 bg-white/70 p-8 shadow-sm">
            <ul className="space-y-3 text-sm text-stone-600">
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
                  Some galleries ask for a password. Use the one they gave you.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                  <Camera className="h-3.5 w-3.5" />
                </span>
                <span>
                  Tap hearts on photos to proof favorites for your photographer.
                </span>
              </li>
            </ul>
          </div>
        )}

        <div className="mt-12 flex justify-center">
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
