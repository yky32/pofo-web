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
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <span className="inline-flex items-center gap-1.5 label-micro text-neutral-500">
            <Lock className="h-3 w-3" />
            Private
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
        <p className="label-micro">Shared with you</p>
        <h1 className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
          Alicia & James
        </h1>
        <p className="mt-2 text-neutral-500">
          Wedding day · Tap hearts to select favorites
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <div className="relative aspect-[21/9] min-h-[200px] overflow-hidden bg-neutral-100">
          <PhotoImage
            src={studioPhotos.heroMain}
            alt="Cover"
            priority
            sizes="100vw"
          />
        </div>
      </div>

      <div className="sticky top-0 z-30 mt-8 border-y border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-sm text-neutral-500">
            Select up to <span className="text-neutral-900">40</span>
          </p>
          <Button
            size="sm"
            className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800"
          >
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            0 / 40
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4">
          {sheet.map((src, i) => {
            const tall = i % 5 === 0 || i % 7 === 3;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                className="group mb-3 w-full break-inside-avoid sm:mb-4"
              >
                <div
                  className={
                    tall
                      ? "photo-edge relative aspect-[3/4]"
                      : "photo-edge relative aspect-square"
                  }
                >
                  <PhotoImage
                    src={src}
                    alt={`Photo ${i + 1}`}
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="transition duration-500 group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center bg-white/95 text-neutral-900 opacity-0 shadow-sm transition group-hover:opacity-100">
                    <Heart className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-12 text-center label-micro text-neutral-300">
          {token}
        </p>
      </main>
    </div>
  );
}
