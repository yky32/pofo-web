import { Heart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoImage } from "@/components/photo/photo-image";
import { Logo } from "@/components/brand/logo";
import { contactSheet, studioPhotos } from "@/lib/photos";

/** V1.1 client — immersive HD cover + liquid glass chrome */
export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sheet = contactSheet;

  return (
    <div className="min-h-screen bg-[oklch(0.1_0.01_50)] text-stone-100">
      {/* Immersive HD cover */}
      <header className="relative">
        <div className="photo-stage relative h-[58vh] min-h-[360px] max-h-[720px] film-grain">
          <PhotoImage
            src={studioPhotos.heroMain}
            alt="Gallery cover"
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[oklch(0.1_0.01_50)] via-[oklch(0.1_0.01_50_/_0.25)] to-black/15" />
          <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_30%,oklch(0.1_0.01_50_/_0.35)_100%)]" />

          <div className="absolute inset-x-0 top-0 z-[2] flex items-center justify-between px-4 py-4 sm:px-8">
            <div className="glass-dark rounded-full px-3 py-1.5">
              <Logo className="text-white" markClassName="text-white" />
            </div>
            <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/85">
              <Lock className="h-3 w-3" />
              Private
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-[2] px-4 pb-8 sm:px-8">
            <div className="glass-dark max-w-xl rounded-2xl p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                Shared with you
              </p>
              <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
                Alicia & James
              </h1>
              <p className="mt-1 text-sm text-white/65">
                Wedding day · Tap hearts to select favorites
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Glass sticky bar */}
      <div className="sticky top-0 z-30 border-b border-white/5">
        <div className="glass-dark absolute inset-0 rounded-none border-x-0 border-t-0" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <p className="text-sm text-stone-400">
            Select up to <span className="text-stone-200">40</span> photos
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
                className="group relative mb-2 w-full break-inside-avoid sm:mb-3"
              >
                <div
                  className={
                    tall
                      ? "photo-stage relative aspect-[3/4] overflow-hidden rounded-xl"
                      : "photo-stage relative aspect-square overflow-hidden rounded-xl"
                  }
                >
                  <PhotoImage
                    src={src}
                    alt={`Photo ${i + 1}`}
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="transition duration-500 group-hover:scale-[1.04]"
                  />
                  <span className="absolute bottom-2 right-2 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-800 opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">
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
