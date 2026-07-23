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
    <div className="min-h-screen bg-[oklch(0.97_0.012_60)]">
      <header className="relative">
        <div className="relative h-[42vh] min-h-[280px] max-h-[420px] overflow-hidden rounded-b-[2rem]">
          <PhotoImage
            src={studioPhotos.heroMain}
            alt="Gallery cover"
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-8">
            <Logo
              className="text-white"
              markClassName="!bg-white/20 !text-white backdrop-blur"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs text-white/90 backdrop-blur">
              <Lock className="h-3 w-3" />
              Private
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-8">
            <p className="text-xs font-medium tracking-wide text-white/70">
              Shared with you
            </p>
            <h1 className="mt-1 font-heading text-4xl font-medium tracking-tight text-white sm:text-5xl">
              Alicia & James
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Wedding day · Tap hearts to select
            </p>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <p className="text-sm text-muted-foreground">
            Select up to <span className="font-medium text-foreground">40</span>
          </p>
          <Button size="sm" className="rounded-full bg-rose hover:bg-rose/90">
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            0 / 40
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
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
                      ? "photo-edge relative aspect-[3/4] shadow-sm ring-1 ring-black/5"
                      : "photo-edge relative aspect-square shadow-sm ring-1 ring-black/5"
                  }
                >
                  <PhotoImage
                    src={src}
                    alt={`Photo ${i + 1}`}
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose opacity-0 shadow transition group-hover:opacity-100">
                    <Heart className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Gallery · {token}
        </p>
      </main>
    </div>
  );
}
