import { Heart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoImage } from "@/components/photo/photo-image";
import { Logo } from "@/components/brand/logo";
import { contactSheet, studioPhotos } from "@/lib/photos";

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sheet = contactSheet;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            <Lock className="h-3 w-3 text-steel" />
            Private
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-lab text-steel">Shared with you</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Alicia & James
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Wedding · Tap frames to select favorites
            </p>
          </div>
          <Button size="sm" className="w-fit bg-steel hover:bg-steel/90">
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            0 / 40
          </Button>
        </div>

        <div className="relative mt-6 aspect-[21/9] min-h-[160px] overflow-hidden rounded-lg border border-border">
          <PhotoImage
            src={studioPhotos.heroMain}
            alt="Cover"
            priority
            sizes="100vw"
          />
        </div>
      </div>

      <div className="sticky top-0 z-30 mt-6 border-y border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <p className="font-mono text-[11px] text-muted-foreground">
            SELECTION LIMIT · 40
          </p>
          <p className="font-mono text-[11px] text-steel">0 SELECTED</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
          {sheet.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className="group photo-edge relative aspect-square ring-1 ring-border transition hover:ring-steel"
            >
              <PhotoImage
                src={src}
                alt={`Frame ${i + 1}`}
                sizes="20vw"
                className="transition group-hover:opacity-95"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 font-mono text-[9px] text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-steel opacity-0 shadow-sm transition group-hover:opacity-100">
                <Heart className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-[10px] text-muted-foreground">
          {token}
        </p>
      </main>
    </div>
  );
}
