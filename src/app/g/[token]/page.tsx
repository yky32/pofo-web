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
    <div className="min-h-screen bg-[oklch(0.12_0.01_50)] text-stone-100">
      {/* Full-bleed cover */}
      <header className="relative">
        <div className="relative h-[42vh] min-h-[280px] max-h-[420px]">
          <PhotoImage
            src={studioPhotos.heroMain}
            alt="Gallery cover"
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.01_50)] via-[oklch(0.12_0.01_50_/_0.4)] to-black/20" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-8">
            <Logo className="text-white" markClassName="text-white" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur">
              <Lock className="h-3 w-3" />
              Private
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-8">
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">
              Shared with you
            </p>
            <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
              Alicia & James
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Wedding day · Tap hearts to select favorites
            </p>
          </div>
        </div>
      </header>

      {/* Sticky selection bar */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-white/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <p className="text-sm text-stone-300">
            Select up to{" "}
            <span className="text-white">40</span> photos
          </p>
          <Button
            size="sm"
            className="rounded-full bg-white/95 text-stone-900 hover:bg-white"
          >
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            0 / 40
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-2 py-6 sm:px-4 sm:py-8">
        <div className="columns-2 gap-2 sm:columns-3 sm:gap-3 md:columns-4">
          {sheet.map((src, i) => {
            const tall = i % 5 === 0 || i % 7 === 3;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                className="group relative mb-2 w-full break-inside-avoid overflow-hidden sm:mb-3"
              >
                <div
                  className={
                    tall ? "relative aspect-[3/4]" : "relative aspect-square"
                  }
                >
                  <PhotoImage
                    src={src}
                    alt={`Photo ${i + 1}`}
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                  <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-800 opacity-0 shadow transition group-hover:opacity-100">
                    <Heart className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-stone-600">
          Gallery · {token}
        </p>
      </main>
    </div>
  );
}
